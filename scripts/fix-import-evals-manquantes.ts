/**
 * Fix #4 : importer les évals Firebase non importées sur les 24 solutions is_firebase_legacy.
 *
 * Règles :
 *   - Skip les évals VIDES (moyenneUtilisateur=0/absent ET aucun score numérique > 0)
 *   - Skip les évals de DAVID AZERAD (rpps 10100394740 — tests perso, cf décision 2026-05-12)
 *   - Skip les évals déjà présentes côté SB (par solution + rpps)
 *   - Si doublon FB (même user+solution), garder l'éval non-vide la plus récente
 *   - User déjà en SB (par RPPS) → import éval seule
 *   - User absent en SB → créer (auth sans email si pas d'email FB, option B) + import éval
 *
 * Format d'import (corrige le bug de import-firebase-late-users.ts du 2026-05-12) :
 *   - 5 critères majeurs (idTech 1-5) → interface/.../qualite_prix = valeur FB /2
 *   - sous-critères (idTech 6-49) → detail_* via IDTECH_TO_DETAIL, valeur /2, fusions N→1 moyennées
 *   - commentaire (idTech 50) → scores.commentaire
 *   - moyenne_utilisateur = moyenneUtilisateur FB /2
 *   - statut 'publiee', created_at = date FB
 *
 * Pas de recalc resultats : les solutions legacy ont leur agrégat figé sur firebase_moyenne_base5
 * et recalcResultatsPourSolution ignore les évals pré-DATE_MISE_EN_LIGNE. Ces imports sont
 * datés de leur date FB d'origine (pré-launch) → aucun impact sur l'agrégat affiché.
 *
 * BACKUP JSON dans docs/. Dry-run par défaut, --execute pour écrire.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'
import * as fsmod from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const sa = require(path.resolve(__dirname, '../../CloudStation/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(sa) })
const fs = getFirestore()
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const EXECUTE = process.argv.includes('--execute')
const DAVID_RPPS = '10100394740'

const NAME_ALIAS_FB: Record<string, string> = {
  'MLM': 'MonLogicielMedical', 'Acteur.fr': 'Acteur', 'Alma Pro': 'AlmaPro', 'AxiSanté 5': 'AxiSante',
  'Doctolib Médecin': 'DoctolibMedecin', 'DrSanté': 'DrSante', 'easy-care': 'EasyCare', 'éO Médecin': 'EOMedecin',
  'MedicaWin': 'Medicawin', 'MEDILINK': 'Medilink', "Med'Oc": 'Medoc', 'TAMM': 'Tamm', 'XMED': 'Xmed',
}
const FB_TO_NAME: Record<string, string> = {}
for (const [nom, fb] of Object.entries(NAME_ALIAS_FB)) FB_TO_NAME[fb] = nom

const MAJOR_BY_IDTECH: Record<string, string> = {
  '1': 'interface', '2': 'fonctionnalites', '3': 'fiabilite', '4': 'editeur', '5': 'qualite_prix',
}

// Mapping idTech → detail_* (identique au Fix #3, CSV officiel + empirique validés)
const IDTECH_TO_DETAIL: Record<string, string> = {
  '6': 'detail_prise_en_main', '7': 'detail_donnees_utiles_prescription', '8': 'detail_reactif',
  '9': 'detail_stabilite', '11': 'detail_ordonnance_pharmacie', '12': 'detail_alertes_ldap',
  '13': 'detail_modeles_ordonnance', '14': 'detail_signature_numerique', '15': 'detail_prescription_autres',
  '16': 'detail_modeles_ordonnance', '17': 'detail_classement_docs', '18': 'detail_courrier_adressage',
  '20': 'detail_resultats_bio', '21': 'detail_teletransmission', '22': 'detail_carnet_adresse',
  '23': 'detail_comptabilite', '24': 'detail_hebergement', '25': 'detail_maj',
  '26': 'detail_messagerie_interne', '27': 'detail_agenda', '28': 'detail_recherche_multicriteres',
  '29': 'detail_modeles_consultation', '31': 'detail_ia_scribe', '32': 'detail_droits_acces',
  '33': 'detail_examens_visualisation', '34': 'detail_teleservices', '35': 'detail_messagerie_securisee',
  '36': 'detail_signature_numerique', '37': 'detail_examens_integration', '38': 'detail_dmp_recuperation',
  '39': 'detail_mobilite', '40': 'detail_teleexpertise', '42': 'detail_resiliation',
  '43': 'detail_pratiques_commerciales', '44': 'detail_sav', '45': 'detail_sav',
  '46': 'detail_formation', '47': 'detail_formation', '48': 'detail_ecoute_besoins', '49': 'detail_nps',
}
const COMMENTAIRE_IDTECH = '50'

function toISO(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString()
  if (typeof val === 'string') { const d = new Date(val); return isNaN(d.getTime()) ? null : d.toISOString() }
  return null
}

async function loadUsers() {
  const byRpps = new Map<string, any>()
  let from = 0
  while (true) {
    const { data } = await s.from('users').select('id, prenom, nom, rpps').not('rpps', 'is', null).range(from, from + 999)
    if (!data?.length) break
    for (const u of data) if ((u as any).rpps) byRpps.set(String((u as any).rpps), u)
    if (data.length < 1000) break
    from += 1000
  }
  return byRpps
}

function buildModernScores(fbByTech: Record<string, any>): { scores: Record<string, any>; moyenneFromMajors: number | null } {
  const scores: Record<string, any> = {}
  // Majeurs
  for (const [tech, key] of Object.entries(MAJOR_BY_IDTECH)) {
    const v = fbByTech[tech]
    if (v != null && v !== '') { const n = Number(v); if (isFinite(n)) scores[key] = Math.round((n / 2) * 100) / 100 }
  }
  // Sous-critères (fusion N→1 par moyenne)
  const detailVals: Record<string, number[]> = {}
  for (const [tech, key] of Object.entries(IDTECH_TO_DETAIL)) {
    const v = fbByTech[tech]
    if (v != null && v !== '') { const n = Number(v); if (isFinite(n)) (detailVals[key] ??= []).push(Math.round((n / 2) * 100) / 100) }
  }
  for (const [key, vals] of Object.entries(detailVals)) {
    scores[key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
  }
  // Commentaire
  const com = fbByTech[COMMENTAIRE_IDTECH]
  if (typeof com === 'string' && com.trim().length > 0) scores.commentaire = com.trim()

  // Moyenne de secours depuis les majeurs (si moyenneUtilisateur FB = 0)
  const majorVals = Object.values(MAJOR_BY_IDTECH).map(k => scores[k]).filter(x => typeof x === 'number' && x > 0)
  const moyenneFromMajors = majorVals.length ? Math.round((majorVals.reduce((a, b) => a + b, 0) / majorVals.length) * 100) / 100 : null
  return { scores, moyenneFromMajors }
}

function isEmpty(fbByTech: Record<string, any>, moy: any): boolean {
  const m = Number(moy)
  if (isFinite(m) && m > 0) return false
  for (const [tech, v] of Object.entries(fbByTech)) {
    if (tech === COMMENTAIRE_IDTECH) continue
    const n = Number(v); if (isFinite(n) && n > 0) return false
  }
  return true
}

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE' : '🟢 DRY-RUN'}\n`)

  // Critères FB hash → idTech
  const crits = await fs.collection('criteres').get()
  const fidToTech = new Map<string, string>()
  for (const c of crits.docs) fidToTech.set(c.id, String((c.data() as any).identifiantTech))

  const { data: solutions } = await s.from('solutions').select('id, nom').eq('is_firebase_legacy', true)
  const solByNom = new Map((solutions ?? []).map(x => [x.nom, x.id]))
  const fbSolKeys = new Set((solutions ?? []).map(x => NAME_ALIAS_FB[x.nom] ?? x.nom))

  const usersFbSnap = await fs.collection('users').get()
  const usersFb = new Map<string, any>()
  for (const d of usersFbSnap.docs) usersFb.set(d.id, { _fid: d.id, ...(d.data() as any) })

  const usersSb = await loadUsers()
  const userIdToRpps = new Map<string, string>()
  for (const [rpps, u] of usersSb.entries()) userIdToRpps.set(u.id, rpps)

  // Set des (nom solution|rpps) déjà présents
  const sbExisting = new Set<string>()
  for (const sol of solutions ?? []) {
    const { data: evals } = await s.from('evaluations').select('user_id').eq('solution_id', sol.id)
    for (const e of evals ?? []) { const r = e.user_id ? userIdToRpps.get(e.user_id) : null; if (r) sbExisting.add(`${sol.nom}|${r}`) }
  }

  // Collecter les évals FB candidates (dédupliquées par sol+rpps, on garde la non-vide la + récente)
  const evalsFbSnap = await fs.collection('evaluations').get()
  const candidates = new Map<string, any>()  // key = nomSb|rpps
  for (const d of evalsFbSnap.docs) {
    const ev = { _fid: d.id, ...(d.data() as any) }
    if (!fbSolKeys.has(ev.idSolution)) continue
    const nomSb = FB_TO_NAME[ev.idSolution] ?? ev.idSolution
    const rpps = String(ev.idUser)
    if (sbExisting.has(`${nomSb}|${rpps}`)) continue
    if (rpps === DAVID_RPPS) continue  // tests perso

    // Reconstruire scores par idTech
    const fbByTech: Record<string, any> = {}
    for (const [fid, v] of Object.entries(ev.scores ?? {})) { const t = fidToTech.get(fid); if (t) fbByTech[t] = v }
    if (isEmpty(fbByTech, ev.moyenneUtilisateur)) continue  // garde-fou vide

    const key = `${nomSb}|${rpps}`
    const existing = candidates.get(key)
    if (!existing || (toISO(ev.creation) ?? '') > (toISO(existing.creation) ?? '')) {
      candidates.set(key, { ...ev, _nomSb: nomSb, _rpps: rpps, _fbByTech: fbByTech })
    }
  }

  console.log(`Candidates à importer (non vides, hors David, hors déjà présentes) : ${candidates.size}\n`)

  // Préparer le plan
  type Plan = {
    key: string; nomSb: string; rpps: string; fbId: string; userExists: boolean;
    userFbNom: string; userFbEmail: string | null; moyenne: number; scores: Record<string, any>; created: string;
  }
  const plans: Plan[] = []
  const skippedNoMajor: string[] = []
  for (const [key, ev] of candidates.entries()) {
    const solId = solByNom.get(ev._nomSb)
    if (!solId) { console.log(`  ⚠️  solution "${ev._nomSb}" introuvable en SB — skip`); continue }
    const { scores, moyenneFromMajors } = buildModernScores(ev._fbByTech)
    const fbMoy = Number(ev.moyenneUtilisateur)
    const moyenne = (isFinite(fbMoy) && fbMoy > 0) ? Math.round((fbMoy / 2) * 100) / 100 : (moyenneFromMajors ?? 0)
    const uFb = usersFb.get(ev._rpps)
    plans.push({
      key, nomSb: ev._nomSb, rpps: ev._rpps, fbId: ev._fid,
      userExists: usersSb.has(ev._rpps),
      userFbNom: uFb ? `${uFb.prenom ?? ''} ${uFb.nom ?? ''}`.trim() : '(user FB absent)',
      userFbEmail: uFb?.contact?.email ?? null,
      moyenne, scores, created: toISO(ev.creation) ?? new Date().toISOString(),
    })
  }

  console.log('Solution           | RPPS         | moy  | userSB | nb scores | nom')
  console.log('─'.repeat(100))
  for (const p of plans.sort((a, b) => a.nomSb.localeCompare(b.nomSb))) {
    const nbScores = Object.keys(p.scores).filter(k => k !== 'commentaire').length
    console.log(`${p.nomSb.padEnd(18)} | ${p.rpps.padEnd(12)} | ${String(p.moyenne).padStart(4)} | ${p.userExists ? 'existe' : ' CRÉER'} | ${String(nbScores).padStart(9)} | ${p.userFbNom.slice(0, 28)}`)
  }
  const toCreate = plans.filter(p => !p.userExists)
  console.log(`\nTotal à importer : ${plans.length} | users à créer : ${toCreate.length}`)
  if (skippedNoMajor.length) {
    console.log(`\nSkippées (aucun critère majeur noté, que des sous-critères) : ${skippedNoMajor.length}`)
    for (const x of skippedNoMajor) console.log(`  - ${x}`)
  }

  if (!EXECUTE) { console.log('\n🟢 Dry-run terminé. Relancer avec --execute pour appliquer.'); return }
  if (plans.length === 0) { console.log('\nRien à faire.'); return }

  console.log('\n🔥 EXECUTION ...')
  const backupPath = path.resolve(__dirname, `../docs/backup-fix-import-evals-20260528-${Date.now()}.json`)
  fsmod.writeFileSync(backupPath, JSON.stringify(plans, null, 2))
  console.log(`Backup JSON (plan d'import) : ${backupPath}`)

  let evalsOk = 0, usersCreated = 0, errors = 0
  for (const p of plans) {
    let userId: string | undefined = usersSb.get(p.rpps)?.id
    if (!userId) {
      // Créer le user (option B : sans email si pas d'email FB)
      const uFb = usersFb.get(p.rpps)
      const email = uFb?.contact?.email ?? null
      try {
        const { data: authData, error: authErr } = await s.auth.admin.createUser({
          email: email ?? `rpps_${p.rpps}@placeholder.100kmed.local`,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { rpps: p.rpps },
        })
        if (authErr) throw authErr
        userId = authData.user.id
        const { error: uErr } = await s.from('users').upsert({
          id: userId, rpps: p.rpps,
          nom: uFb?.nom ?? null, prenom: uFb?.prenom ?? null, pseudo: uFb?.pseudo ?? null,
          email: email ?? `rpps_${p.rpps}@placeholder.100kmed.local`,
          role: 'medecin', specialite: uFb?.specialite ?? null, mode_exercice: uFb?.modeExercice ?? null,
          is_complete: false,
          created_at: toISO(uFb?.creation) ?? new Date().toISOString(),
        })
        if (uErr) throw uErr
        usersCreated++
      } catch (e: any) {
        console.log(`  ❌ création user rpps=${p.rpps} : ${e.message}`); errors++; continue
      }
    }

    const { error: evErr } = await s.from('evaluations').upsert({
      user_id: userId, solution_id: solByNom.get(p.nomSb),
      scores: p.scores, moyenne_utilisateur: p.moyenne,
      last_date_note: p.created, created_at: p.created, statut: 'publiee',
    } as any, { onConflict: 'user_id,solution_id' })
    if (evErr) { console.log(`  ❌ insert eval ${p.fbId} (${p.nomSb}/${p.rpps}) : ${evErr.message}`); errors++ }
    else evalsOk++
  }
  console.log(`\n✅ ${evalsOk} évals importées, ${usersCreated} users créés, ${errors} erreurs.`)
}

main().catch(e => { console.error(e); process.exit(1) })
