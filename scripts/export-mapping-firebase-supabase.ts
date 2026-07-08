/**
 * Génère un classeur Excel de correspondance Firebase ↔ Supabase.
 *
 * LECTURE SEULE des deux côtés (aucune écriture). Produit un .xlsx multi-onglets.
 *
 * Le mapping par ID technique exact (doc Firestore → UUID Supabase) n'a JAMAIS été
 * persisté lors de la migration (cf scripts/migrate-firebase-to-supabase.ts : UUID
 * générés aléatoirement en mémoire). On reconstitue donc le lien via des CLÉS MÉTIER
 * stables, qui sont reproductibles :
 *   - solutions / catégories : slug Supabase == firebaseId.toLowerCase()
 *   - users                  : rpps (Firebase d.rpps || _fid → users.rpps)
 *   - editeurs               : nom (pas de slug stable)
 *   - evaluations            : couple (user rpps + solution slug)
 *
 * Onglets produits :
 *   - Users, Solutions, Editeurs, Evaluations  → mapping ID Firebase ↔ UUID Supabase
 *   - Redirections_URL                          → anciennes URLs Quasar → nouvelles URLs
 *   - Lisez-moi                                 → méthodo + limites
 *
 * Usage : npx tsx scripts/export-mapping-firebase-supabase.ts
 * Sortie : docs/mapping-firebase-supabase-<timestamp>.xlsx  (NON commité — données perso)
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createWorkbook, addSheetFromJson, writeWorkbook } from './lib/excel-helper'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ─── Firebase (lecture seule) ───────────────────────────────
const serviceAccount = require(path.resolve(
  __dirname,
  '../../CloudStation/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'
))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

// ─── Supabase (service role, lecture seule) ─────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type FbDoc = { _fid: string; [k: string]: any }

async function fetchCollection(name: string): Promise<FbDoc[]> {
  const snap = await firestore.collection(name).get()
  return snap.docs.map((doc) => ({ _fid: doc.id, ...doc.data() }))
}

// Récupère TOUTES les lignes d'une table Supabase (pagination 1000).
async function fetchAllSupabase(table: string, columns: string): Promise<any[]> {
  const rows: any[] = []
  let page = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    page++
  }
  return rows
}

async function main() {
  console.log('📥 Lecture Firebase (lecture seule)...')
  const [fbUsers, fbSolutions, fbEditeurs, fbEvaluations] = await Promise.all([
    fetchCollection('users'),
    fetchCollection('solutions'),
    fetchCollection('editeurs'),
    fetchCollection('evaluations'),
  ])
  console.log(
    `  FB: ${fbUsers.length} users, ${fbSolutions.length} solutions, ${fbEditeurs.length} editeurs, ${fbEvaluations.length} evaluations`
  )

  console.log('📥 Lecture Supabase (lecture seule)...')
  const [sbUsers, sbSolutions, sbEditeurs, sbEvaluations] = await Promise.all([
    fetchAllSupabase('users', 'id, rpps, nom, prenom, email'),
    fetchAllSupabase('solutions', 'id, slug, nom, id_editeur'),
    fetchAllSupabase('editeurs', 'id, nom'),
    fetchAllSupabase('evaluations', 'id, user_id, solution_id'),
  ])
  console.log(
    `  SB: ${sbUsers.length} users, ${sbSolutions.length} solutions, ${sbEditeurs.length} editeurs, ${sbEvaluations.length} evaluations`
  )

  // ─── Index Supabase par clé métier ───────────────────────
  const sbUserByRpps = new Map(sbUsers.filter((u) => u.rpps).map((u) => [String(u.rpps), u]))
  const sbSolBySlug = new Map(sbSolutions.filter((s) => s.slug).map((s) => [String(s.slug), s]))
  const sbEditByNom = new Map(
    sbEditeurs.filter((e) => e.nom).map((e) => [String(e.nom).trim().toLowerCase(), e])
  )
  // évals SB indexées par couple (user_id, solution_id)
  const sbEvalByPair = new Map(
    sbEvaluations.map((e) => [`${e.user_id}__${e.solution_id}`, e])
  )

  // ─── Onglet USERS ────────────────────────────────────────
  const usersRows = fbUsers.map((u) => {
    const rpps = String(u.rpps || u._fid)
    const sb = sbUserByRpps.get(rpps)
    return {
      firebase_id: u._fid,
      rpps,
      nom: u.nom || '',
      prenom: u.prenom || '',
      email_firebase: u.contact?.email || '',
      supabase_uuid: sb?.id || '',
      email_supabase: sb?.email || '',
      statut: sb ? 'MATCH (rpps)' : 'ABSENT côté Supabase',
    }
  })

  // ─── Onglet SOLUTIONS ────────────────────────────────────
  const solutionsRows = fbSolutions.map((s) => {
    const slug = String(s._fid).toLowerCase()
    const sb = sbSolBySlug.get(slug)
    return {
      firebase_id: s._fid,
      slug,
      nom_firebase: s.nom || '',
      supabase_uuid: sb?.id || '',
      nom_supabase: sb?.nom || '',
      statut: sb ? 'MATCH (slug)' : 'ABSENT côté Supabase',
    }
  })

  // ─── Onglet EDITEURS ─────────────────────────────────────
  const editeursRows = fbEditeurs.map((e) => {
    const sb = sbEditByNom.get(String(e.nom || '').trim().toLowerCase())
    return {
      firebase_id: e._fid,
      nom_firebase: e.nom || '',
      supabase_uuid: sb?.id || '',
      nom_supabase: sb?.nom || '',
      statut: sb ? 'MATCH (nom)' : 'ABSENT / nom divergent',
    }
  })

  // ─── Onglet EVALUATIONS ──────────────────────────────────
  // Croise via (rpps utilisateur + slug solution) → (user_uuid + solution_uuid) → éval SB
  const evalRows = fbEvaluations.map((ev) => {
    const rpps = String(ev.idUser ? (fbUsers.find((u) => u._fid === ev.idUser)?.rpps ?? ev.idUser) : '')
    const sbUser = sbUserByRpps.get(rpps)
    const slug = ev.idSolution ? String(ev.idSolution).toLowerCase() : ''
    const sbSol = sbSolBySlug.get(slug)
    const sbEval =
      sbUser && sbSol ? sbEvalByPair.get(`${sbUser.id}__${sbSol.id}`) : undefined
    return {
      firebase_id: ev._fid,
      firebase_id_user: ev.idUser || '',
      rpps_user: rpps,
      firebase_id_solution: ev.idSolution || '',
      slug_solution: slug,
      supabase_eval_uuid: sbEval?.id || '',
      supabase_user_uuid: sbUser?.id || '',
      supabase_solution_uuid: sbSol?.id || '',
      statut: sbEval
        ? 'MATCH (user+solution)'
        : sbUser && sbSol
          ? 'user+solution OK mais éval absente'
          : 'user ou solution introuvable',
    }
  })

  // ─── Onglet REDIRECTIONS URL ─────────────────────────────
  // Cf docs/2026-05-29-redirections-404-seo.md. Les fiches solution/editeur gardent le même schéma
  // (slug identique), donc pas de redirection pour elles ; seules les pages renommées listées.
  const redirectionsRows = [
    { ancienne_url: '/difficileDeChanger', nouvelle_url: '/difficile-de-changer', type: '301', note: 'renommage camelCase→kebab' },
    { ancienne_url: '/tousEnsemble', nouvelle_url: '/tous-ensemble', type: '301', note: 'renommage' },
    { ancienne_url: '/lancement100k', nouvelle_url: '/lancement-100k', type: '301', note: 'renommage' },
    { ancienne_url: '/presentation100k', nouvelle_url: '/qui-sommes-nous', type: '301', note: 'page équivalente' },
    { ancienne_url: '/monCompte', nouvelle_url: '/mon-compte/profil', type: '301', note: 'renommage' },
    { ancienne_url: '/monCompte/mesFavoris', nouvelle_url: '/mon-compte/mes-favoris', type: '301', note: 'renommage' },
    { ancienne_url: '/monCompte/mesPreferences', nouvelle_url: '/mon-compte/mes-preferences', type: '301', note: 'renommage' },
    { ancienne_url: '/monCompte/MesOutils', nouvelle_url: '/mon-compte/profil', type: '301', note: 'renommage' },
    { ancienne_url: '/connexion/creationCompte/identifiants', nouvelle_url: '/inscription', type: '301', note: 'flux inscription' },
    { ancienne_url: '/connexion/creationCompte/donneesPerso', nouvelle_url: '/inscription', type: '301', note: 'flux inscription' },
    { ancienne_url: '/solutions/:cat/:slugA-vs-:slugB', nouvelle_url: '/solutions/comparer?ids=:uuidA,:uuidB', type: '301 dynamique', note: 'résolution slugs→UUID dans la page solution' },
    { ancienne_url: '/solutions/:cat/:slug', nouvelle_url: '/solutions/:cat/:slug', type: 'inchangé', note: 'même schéma, slug identique — pas de redirect' },
    { ancienne_url: '/editeur/:idEditeur', nouvelle_url: '/editeur/:idEditeur', type: 'inchangé', note: 'UUID des deux côtés (cf TODO : passage en slug à venir)' },
  ]

  // ─── Onglet LISEZ-MOI ────────────────────────────────────
  const lisezMoi = [
    { info: 'Généré le', valeur: new Date().toISOString() },
    { info: 'Source', valeur: 'Firebase prod (lecture seule) + Supabase prod (lecture seule)' },
    { info: 'Limite majeure', valeur: 'Le mapping par ID technique exact (doc Firestore → UUID) n a jamais été persisté lors de la migration (UUID aléatoires en mémoire). Le lien est reconstitué via clés métier stables.' },
    { info: 'Clé users', valeur: 'rpps (Firebase rpps||_fid ↔ users.rpps)' },
    { info: 'Clé solutions', valeur: 'slug = firebaseId.toLowerCase() (lien direct et reproductible)' },
    { info: 'Clé editeurs', valeur: 'nom (pas de slug stable — match approximatif si nom divergent)' },
    { info: 'Clé evaluations', valeur: 'couple (rpps user + slug solution) → couple (user_uuid + solution_uuid)' },
    { info: 'Données personnelles', valeur: 'Ce fichier contient emails + RPPS de médecins. NE PAS committer. Garder en local / NAS.' },
  ]

  // ─── Construction du classeur ────────────────────────────
  // Migration xlsx → exceljs (2026-06-06) : API encapsulée dans excel-helper.
  const wb = createWorkbook()
  addSheetFromJson(wb, 'Lisez-moi', lisezMoi)
  addSheetFromJson(wb, 'Users', usersRows)
  addSheetFromJson(wb, 'Solutions', solutionsRows)
  addSheetFromJson(wb, 'Editeurs', editeursRows)
  addSheetFromJson(wb, 'Evaluations', evalRows)
  addSheetFromJson(wb, 'Redirections_URL', redirectionsRows)

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.resolve(__dirname, `../docs/mapping-firebase-supabase-${ts}.xlsx`)
  await writeWorkbook(wb, outPath)

  // ─── Récap console ───────────────────────────────────────
  const countMatch = (rows: any[]) => rows.filter((r) => String(r.statut).startsWith('MATCH')).length
  console.log('\n✅ Classeur généré :', outPath)
  console.log(`   Users        : ${countMatch(usersRows)}/${usersRows.length} matchés`)
  console.log(`   Solutions    : ${countMatch(solutionsRows)}/${solutionsRows.length} matchés`)
  console.log(`   Editeurs     : ${countMatch(editeursRows)}/${editeursRows.length} matchés`)
  console.log(`   Evaluations  : ${countMatch(evalRows)}/${evalRows.length} matchés`)
}

main().catch((e) => {
  console.error('❌ Erreur:', e)
  process.exit(1)
})
