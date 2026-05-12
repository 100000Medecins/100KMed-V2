/**
 * Importe les utilisateurs Firebase créés depuis une date pivot
 * qui ne sont pas (ou pas correctement) présents dans Supabase.
 *
 * Source : collection Firestore `users` (doc ID = RPPS).
 * Date pivot par défaut : 2026-01-01.
 *
 * Usage :
 *   npx tsx scripts/import-firebase-late-users.ts             # dry-run (lecture seule)
 *   npx tsx scripts/import-firebase-late-users.ts --execute   # exécution réelle
 *   npx tsx scripts/import-firebase-late-users.ts --since=2026-03-01
 *
 * Cas particuliers gérés en dur :
 *   - SKIP_RPPS : on ignore certains RPPS (ex: dr.azerad@gmail.com, tests perso)
 *   - SPECIAL_USERS : users déjà dans Supabase mais avec évals Firebase manquantes
 *                    (ex: eva.de.peretti — importer uniquement Odaiji)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Args ──────────────────────────────────────────────────────
const args = process.argv.slice(2)
const IS_EXECUTE = args.includes('--execute')
const sinceArg = args.find(a => a.startsWith('--since='))
const CUTOFF_DATE = sinceArg ? sinceArg.split('=')[1] : '2026-01-01'

// ─── Cas particuliers ─────────────────────────────────────────
const SKIP_RPPS = new Set<string>([
  '10100394740', // dr.azerad@gmail.com — David, évals de test perso
])

// Users déjà migrés mais avec évals Firebase manquantes : import ciblé d'évals
const SPECIAL_USERS: Array<{ rpps: string; email: string; importSolutionSlugs: string[] }> = [
  {
    rpps: '10100467934',
    email: 'eva.de.peretti@gmail.com',
    importSolutionSlugs: ['odaiji'], // skip crossway (déjà dans Supabase)
  },
]

// ─── Helpers ───────────────────────────────────────────────────
function norm(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase()
}

function toNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function toISOString(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString()
  if (typeof val === 'string' && val.length > 0) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

async function fetchAllSupabaseUsers() {
  const rpps = new Map<string, { id: string; email: string | null }>()
  const emails = new Map<string, { id: string; rpps: string | null }>()

  let page = 0
  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id, rpps, email, contact_email')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const u of data as any[]) {
      if (u.rpps) rpps.set(u.rpps, { id: u.id, email: u.email })
      const e1 = norm(u.email)
      const e2 = norm(u.contact_email)
      if (e1) emails.set(e1, { id: u.id, rpps: u.rpps })
      if (e2 && e2 !== e1) emails.set(e2, { id: u.id, rpps: u.rpps })
    }
    if (data.length < 1000) break
    page++
  }

  let authPage = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: authPage, perPage: 1000 })
    if (error) throw error
    if (!data || data.users.length === 0) break
    for (const u of data.users) {
      const e = norm(u.email)
      if (e && !emails.has(e)) emails.set(e, { id: u.id, rpps: null })
    }
    if (data.users.length < 1000) break
    authPage++
  }

  return { rpps, emails }
}

async function fetchEvaluationsByUser(rppsId: string) {
  const snap = await firestore.collection('evaluations').where('idUser', '==', rppsId).get()
  return snap.docs.map(d => ({ _fid: d.id, ...d.data() }) as any)
}

async function fetchSupabaseEvalKeys(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('evaluations').select('solution_id').eq('user_id', userId)
  return new Set((data || []).map((r: any) => r.solution_id))
}

// ─── Mappings nécessaires à l'exécution ───────────────────────
async function loadCritereIdToTech() {
  const snap = await firestore.collection('criteres').get()
  const map = new Map<string, string>()
  for (const d of snap.docs) {
    const tech = (d.data() as any).identifiantTech
    if (tech) map.set(d.id, String(tech))
  }
  return map
}

async function loadSolutionsBySlug() {
  const { data, error } = await supabase.from('solutions').select('id, slug')
  if (error) throw error
  const map = new Map<string, string>()
  for (const s of data as any[]) {
    if (s.slug) map.set(s.slug.toLowerCase(), s.id)
  }
  return map
}

// ─── Import d'un user complet (auth + profil + évals) ─────────
async function importNewUser(
  u: any,
  fbEvals: any[],
  critereIdToTech: Map<string, string>,
  solBySlug: Map<string, string>,
  affectedSolutions: Set<string>,
) {
  const rpps = u.rpps || u._fid
  const email = u.contact?.email
  if (!email) throw new Error(`User ${rpps} sans email`)

  // 1. Auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { rpps },
  })
  if (authErr) throw new Error(`auth.createUser ${rpps}: ${authErr.message}`)
  const userId = authData.user.id

  // 2. Public users
  const { error: userErr } = await supabase.from('users').upsert({
    id: userId,
    rpps,
    nom: u.nom || null,
    prenom: u.prenom || null,
    pseudo: u.pseudo || null,
    email,
    role: 'medecin',
    annee_naissance: u.anneeNaissance || null,
    specialite: u.specialite || null,
    mode_exercice: u.modeExercice || null,
    densite_population: u.densitePopulation || null,
    niveau_outils_numeriques: u.niveauOutilsNumeriques || null,
    portrait: u.portrait || null,
    is_actif: u.isActif ?? true,
    is_complete: u.isComplete ?? false,
    gestion_accueil: u.gestionAccueil || null,
    contact_email: u.contact?.email || null,
    contact_telephone: u.contact?.telephone || null,
    contact_adresse: u.contact?.adresse || null,
    contact_cp: u.contact?.cp || null,
    contact_ville: u.contact?.ville || null,
    contact_pays: u.contact?.pays || null,
    created_at: toISOString(u.creation) || new Date().toISOString(),
  })
  if (userErr) throw new Error(`users.upsert ${rpps}: ${userErr.message}`)

  // 3. Évals
  for (const ev of fbEvals) {
    await importEval(ev, userId, critereIdToTech, solBySlug, affectedSolutions)
  }

  return userId
}

async function importEval(
  ev: any,
  userId: string,
  critereIdToTech: Map<string, string>,
  solBySlug: Map<string, string>,
  affectedSolutions: Set<string>,
) {
  const slug = ev.idSolution?.toLowerCase()
  if (!slug) return
  const solId = solBySlug.get(slug)
  if (!solId) {
    console.warn(`    ⚠️  solution non trouvée pour idSolution="${ev.idSolution}" — skip`)
    return
  }

  // Remapping des scores : clé Firestore (id critère) → identifiantTech
  const remapped: Record<string, number | null> = {}
  if (ev.scores && typeof ev.scores === 'object') {
    for (const [cid, score] of Object.entries(ev.scores)) {
      const tech = critereIdToTech.get(cid)
      if (tech) remapped[tech] = toNumber(score)
    }
  }

  const created = toISOString(ev.creation) || new Date().toISOString()
  const last = toISOString(ev.lastDateNote) || created

  // Évaluation publiée (user authentifié RPPS, donc considéré comme validé)
  const { error: evErr } = await supabase.from('evaluations').upsert(
    {
      user_id: userId,
      solution_id: solId,
      scores: Object.keys(remapped).length > 0 ? remapped : (ev.scores || {}),
      moyenne_utilisateur: Math.min(toNumber(ev.moyenneUtilisateur) ?? 0, 9.99),
      temps_precedente_solution: ev.tempsPrecedenteSolution || null,
      last_date_note: last,
      created_at: created,
      statut: 'publiee',
    } as any,
    { onConflict: 'user_id,solution_id' },
  )
  if (evErr) {
    console.warn(`    ⚠️  insert eval ${ev._fid} → solution=${slug}: ${evErr.message}`)
    return
  }

  // solutions_utilisees
  const { data: suExisting } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solId)
    .eq('user_id', userId)
    .limit(1)
  if (!suExisting || suExisting.length === 0) {
    const { error: suErr } = await supabase.from('solutions_utilisees').insert({
      user_id: userId,
      solution_id: solId,
      statut_evaluation: 'finalisee',
      date_debut: (ev.creation || new Date().toISOString()).slice(0, 10),
    })
    if (suErr) console.warn(`    ⚠️  insert solutions_utilisees: ${suErr.message}`)
  }

  affectedSolutions.add(solId)
}

// ─── Recalc resultats inline (équivalent recalcResultatsPourSolution) ─────
async function recalcResultats(solutionId: string) {
  const { data: criteres } = await supabase
    .from('criteres')
    .select('id, identifiant_tech')
    .not('identifiant_tech', 'is', null)
  if (!criteres) return

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('scores, user_id')
    .eq('solution_id', solutionId)
    .eq('statut', 'publiee')

  if (!evaluations || evaluations.length === 0) return

  for (const critere of criteres as any[]) {
    const key = critere.identifiant_tech as string
    const notes: Record<string, number> = {}
    for (const evRow of evaluations as any[]) {
      const raw = (evRow.scores as Record<string, unknown> | null)?.[key]
      const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
      if (!isNaN(num) && evRow.user_id) notes[evRow.user_id] = num
    }
    const nbNotes = Object.keys(notes).length
    if (nbNotes === 0) continue
    const moyenne = Math.round((Object.values(notes).reduce((s, v) => s + v, 0) / nbNotes) * 100) / 100
    const payload = {
      solution_id: solutionId,
      critere_id: critere.id,
      notes,
      nb_notes: nbNotes,
      moyenne_utilisateurs: moyenne,
      moyenne_utilisateurs_base5: moyenne,
    }
    const { data: existing } = await supabase
      .from('resultats')
      .select('id')
      .eq('solution_id', solutionId)
      .eq('critere_id', critere.id)
      .maybeSingle()
    if (existing) await supabase.from('resultats').update(payload).eq('id', (existing as any).id)
    else await supabase.from('resultats').insert(payload)
  }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Scan Firebase Firestore — users créés depuis ${CUTOFF_DATE} (inclus)`)
  console.log(`   Mode: ${IS_EXECUTE ? '⚠️  EXÉCUTION RÉELLE' : 'DRY-RUN (lecture seule)'}\n`)

  // 1. Tous les users Firestore
  const usersSnap = await firestore.collection('users').get()
  const allFbUsers = usersSnap.docs.map(d => ({ _fid: d.id, ...d.data() }) as any)
  console.log(`📥 ${allFbUsers.length} users Firestore au total`)

  // 2. Filtre date pivot
  const fbUsers = allFbUsers.filter(u => {
    if (!u.creation) return false
    const c = typeof u.creation === 'string' ? u.creation : ''
    return c >= CUTOFF_DATE
  })
  fbUsers.sort((a, b) => String(a.creation).localeCompare(String(b.creation)))
  console.log(`📥 ${fbUsers.length} users avec creation >= ${CUTOFF_DATE}\n`)

  // 3. Snapshot Supabase
  console.log('📥 Chargement index Supabase (rpps + emails)...')
  const { rpps: supaRpps, emails: supaEmails } = await fetchAllSupabaseUsers()
  console.log(`   ${supaRpps.size} RPPS connus, ${supaEmails.size} emails connus\n`)

  // 4. Doublons internes Firebase
  const fbEmailGroups = new Map<string, any[]>()
  for (const u of fbUsers) {
    const e = norm(u.contact?.email)
    if (!e) continue
    if (!fbEmailGroups.has(e)) fbEmailGroups.set(e, [])
    fbEmailGroups.get(e)!.push(u)
  }
  const fbInternalDups = Array.from(fbEmailGroups.entries()).filter(([, list]) => list.length > 1)

  // 5. Classification
  const buckets = {
    already_rpps: [] as any[],
    email_conflict: [] as any[],
    to_import: [] as any[],
    no_email: [] as any[],
  }

  for (const u of fbUsers) {
    const r = u.rpps || u._fid
    const e = norm(u.contact?.email)
    if (supaRpps.has(r)) {
      buckets.already_rpps.push({ u, supaUserId: supaRpps.get(r)!.id })
    } else if (!e) {
      buckets.no_email.push({ u })
    } else if (supaEmails.has(e)) {
      buckets.email_conflict.push({ u, supaUserId: supaEmails.get(e)!.id, supaRpps: supaEmails.get(e)!.rpps })
    } else {
      buckets.to_import.push({ u })
    }
  }

  console.log('═'.repeat(70))
  console.log(`📊 RÉSUMÉ — fenêtre ${CUTOFF_DATE} → aujourd'hui`)
  console.log('═'.repeat(70))
  console.log(`   ${fbUsers.length.toString().padStart(4)}  users Firebase dans la fenêtre`)
  console.log(`   ${buckets.already_rpps.length.toString().padStart(4)}  déjà dans Supabase via RPPS`)
  console.log(`   ${buckets.email_conflict.length.toString().padStart(4)}  conflit email`)
  console.log(`   ${buckets.to_import.length.toString().padStart(4)}  candidats à l'import`)
  console.log(`   ${buckets.no_email.length.toString().padStart(4)}  sans email (skip)`)
  console.log(`   ${fbInternalDups.length.toString().padStart(4)}  doublons internes Firebase`)

  // Filtre des candidats : retirer SKIP_RPPS
  const toImport = buckets.to_import.filter(({ u }) => {
    const r = u.rpps || u._fid
    if (SKIP_RPPS.has(r)) {
      console.log(`   ⏭️  Skip ${r} (${u.contact?.email}) — listé dans SKIP_RPPS`)
      return false
    }
    return true
  })

  // ─── Mode DRY-RUN : on s'arrête là après quelques détails utiles ─
  if (!IS_EXECUTE) {
    console.log(`\n✨ ${toImport.length} users seraient importés.`)
    if (SPECIAL_USERS.length > 0) {
      console.log(`✨ ${SPECIAL_USERS.length} user(s) déjà migré(s) recevraient des évals ciblées :`)
      for (const s of SPECIAL_USERS) {
        console.log(`   - ${s.email} (RPPS ${s.rpps}) → solutions: ${s.importSolutionSlugs.join(', ')}`)
      }
    }
    console.log('\n💡 Lancer avec --execute pour exécuter.\n')
    return
  }

  // ─── Mode EXÉCUTION ─────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70))
  console.log('⚙️  EXÉCUTION')
  console.log('═'.repeat(70) + '\n')

  // Pré-chargement des mappings
  console.log('📥 Chargement critereId → identifiantTech...')
  const critereIdToTech = await loadCritereIdToTech()
  console.log(`   ${critereIdToTech.size} critères mappés`)

  console.log('📥 Chargement solutions Supabase (slug → id)...')
  const solBySlug = await loadSolutionsBySlug()
  console.log(`   ${solBySlug.size} solutions indexées\n`)

  const affectedSolutions = new Set<string>()
  let okCount = 0
  let evalCount = 0
  let errCount = 0

  // 1. Import des nouveaux users
  console.log(`👤 Import de ${toImport.length} users...\n`)
  for (const { u } of toImport) {
    const rpps = u.rpps || u._fid
    const fbEvals = await fetchEvaluationsByUser(rpps)
    try {
      await importNewUser(u, fbEvals, critereIdToTech, solBySlug, affectedSolutions)
      okCount++
      evalCount += fbEvals.length
      console.log(`  ✅ ${rpps} | ${u.contact?.email} | ${fbEvals.length} éval(s)`)
    } catch (e: any) {
      errCount++
      console.error(`  ❌ ${rpps} | ${u.contact?.email}: ${e.message}`)
    }
  }

  // 2. Cas spéciaux : users déjà présents, import d'évals ciblées
  if (SPECIAL_USERS.length > 0) {
    console.log(`\n🎯 Import ciblé d'évals pour users déjà migrés...\n`)
    for (const special of SPECIAL_USERS) {
      const supa = supaRpps.get(special.rpps)
      if (!supa) {
        console.warn(`  ⚠️  RPPS ${special.rpps} (${special.email}) introuvable côté Supabase — skip`)
        continue
      }
      const userId = supa.id
      const fbEvals = await fetchEvaluationsByUser(special.rpps)
      const want = new Set(special.importSolutionSlugs.map(s => s.toLowerCase()))
      const targeted = fbEvals.filter(ev => want.has(String(ev.idSolution || '').toLowerCase()))
      console.log(`  🎯 ${special.email} | ${targeted.length}/${fbEvals.length} éval(s) à importer`)
      for (const ev of targeted) {
        try {
          await importEval(ev, userId, critereIdToTech, solBySlug, affectedSolutions)
          evalCount++
          console.log(`     ✅ ${ev.idSolution}`)
        } catch (e: any) {
          errCount++
          console.error(`     ❌ ${ev.idSolution}: ${e.message}`)
        }
      }
    }
  }

  // 3. Recalcul des résultats agrégés
  console.log(`\n🧮 Recalcul des résultats agrégés pour ${affectedSolutions.size} solution(s)...`)
  for (const sid of affectedSolutions) {
    try {
      await recalcResultats(sid)
    } catch (e: any) {
      console.error(`   ❌ recalc ${sid}: ${e.message}`)
    }
  }
  console.log(`   ✅ Recalc terminé`)

  // ─── Bilan ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70))
  console.log('🎉 EXÉCUTION TERMINÉE')
  console.log('═'.repeat(70))
  console.log(`   ${okCount} users créés`)
  console.log(`   ${evalCount} évaluations importées`)
  console.log(`   ${affectedSolutions.size} solutions recalculées`)
  console.log(`   ${errCount} erreurs`)
  console.log('═'.repeat(70))
}

main().catch(err => { console.error('💥', err); process.exit(1) })
