/**
 * Fix #1bis : recalculer moyenne_utilisateur pour les évaluations SB matchées avec
 * une éval FB où moyenneUtilisateur=0 (artéfact Firebase, ex. MLM 2023-01-20).
 *
 * Règle : moyenne_utilisateur = moyenne des 5 critères majeurs SB en EXCLUANT les null
 *        (au lieu de les compter comme 0, ce qui était le bug du calcul migration).
 *
 * Ne touche PAS les scores individuels. Ne touche QUE moyenne_utilisateur.
 *
 * BACKUP : JSON dans docs/.
 *
 * Usage :
 *   npx tsx scripts/fix-firebase-evals-fb-zero.ts          # dry-run
 *   npx tsx scripts/fix-firebase-evals-fb-zero.ts --execute # écrit
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const serviceAccount = require(path.resolve(
  __dirname,
  '../../CloudStation/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'
))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const EXECUTE = process.argv.includes('--execute')

const MAJOR_CRITERES = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

const NAME_ALIAS_FB: Record<string, string> = {
  'MLM': 'MonLogicielMedical',
  'Acteur.fr': 'Acteur',
  'Alma Pro': 'AlmaPro',
  'AxiSanté 5': 'AxiSante',
  'Doctolib Médecin': 'DoctolibMedecin',
  'DrSanté': 'DrSante',
  'easy-care': 'EasyCare',
  'éO Médecin': 'EOMedecin',
  'MedicaWin': 'Medicawin',
  'MEDILINK': 'Medilink',
  "Med'Oc": 'Medoc',
  'TAMM': 'Tamm',
  'XMED': 'Xmed',
}

async function loadUsersByRpps() {
  const byRpps = new Map<string, any>()
  const byUserId = new Map<string, string>()
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data: batch } = await s
      .from('users')
      .select('id, prenom, nom, rpps')
      .not('rpps', 'is', null)
      .range(from, from + PAGE - 1)
    if (!batch || batch.length === 0) break
    for (const u of batch) {
      if ((u as any).rpps) {
        byRpps.set(String((u as any).rpps), u)
        byUserId.set(u.id, String((u as any).rpps))
      }
    }
    if (batch.length < PAGE) break
    from += PAGE
  }
  return { byRpps, byUserId }
}

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE' : '🟢 DRY-RUN'}\n`)

  const evalsFbSnap = await firestore.collection('evaluations').get()
  const evalsFbBySolUser = new Map<string, any>()
  for (const d of evalsFbSnap.docs) {
    const data = { _fid: d.id, ...(d.data() as any) }
    evalsFbBySolUser.set(`${data.idSolution}|${data.idUser}`, data)
  }

  const { data: solutions } = await s.from('solutions').select('id, nom').eq('is_firebase_legacy', true)
  const users = await loadUsersByRpps()
  console.log(`Users RPPS chargés : ${users.byRpps.size}\n`)

  type Update = {
    evalId: string
    sol: string
    rpps: string
    userNom: string
    oldMoyenne: number | null
    newMoyenne: number
    nbCriteresUtilises: number
    scores: Record<string, any>
  }
  const updates: Update[] = []

  for (const sol of solutions ?? []) {
    const fbSolKey = NAME_ALIAS_FB[sol.nom] ?? sol.nom
    const { data: evalsSb } = await s
      .from('evaluations')
      .select('id, user_id, created_at, moyenne_utilisateur, scores')
      .eq('solution_id', sol.id)
    if (!evalsSb) continue

    for (const sbEval of evalsSb) {
      if (!sbEval.user_id) continue
      const rpps = users.byUserId.get(sbEval.user_id)
      if (!rpps) continue
      const fb = evalsFbBySolUser.get(`${fbSolKey}|${rpps}`)
      if (!fb) continue

      const fbMoy = Number(fb.moyenneUtilisateur)
      // On ne cible QUE les évals FB avec moyenneUtilisateur=0 ou invalide
      if (isFinite(fbMoy) && fbMoy > 0) continue

      // Calculer la nouvelle moyenne SB en excluant les null
      const sbScores = (sbEval.scores ?? {}) as Record<string, any>
      const validValues: number[] = []
      for (const k of MAJOR_CRITERES) {
        const v = sbScores[k]
        if (typeof v === 'number' && isFinite(v) && v > 0) {
          validValues.push(v)
        }
      }
      if (validValues.length === 0) continue  // tous les majeurs sont absents/null → on ne sait pas calculer

      const newMoyenne = Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 100) / 100
      const oldMoyenne = sbEval.moyenne_utilisateur as number | null

      // Ne pousser que si différent
      if (oldMoyenne != null && Math.abs(oldMoyenne - newMoyenne) < 0.01) continue

      const u = users.byRpps.get(rpps)
      updates.push({
        evalId: sbEval.id,
        sol: sol.nom,
        rpps,
        userNom: u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : '?',
        oldMoyenne,
        newMoyenne,
        nbCriteresUtilises: validValues.length,
        scores: sbScores,
      })
    }
  }

  console.log(`=== PLAN ===`)
  console.log(`Updates prévues : ${updates.length}`)
  if (updates.length === 0) {
    console.log('\nRien à faire.')
    return
  }

  // Top 20 plus gros changements
  const sorted = [...updates].sort((a, b) => Math.abs(b.newMoyenne - (b.oldMoyenne ?? 0)) - Math.abs(a.newMoyenne - (a.oldMoyenne ?? 0))).slice(0, 20)
  console.log('\nTop 20 plus gros changements :')
  console.log('Solution              | RPPS         | old → new | nb crit utilisés')
  console.log('─'.repeat(80))
  for (const u of sorted) {
    console.log(`${u.sol.slice(0, 20).padEnd(20)} | ${u.rpps.padEnd(12)} | ${String(u.oldMoyenne).padStart(4)} → ${String(u.newMoyenne).padEnd(4)} | ${u.nbCriteresUtilises}/5`)
  }

  // Distribution nb critères utilisés
  const distNbCrit: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const u of updates) distNbCrit[u.nbCriteresUtilises]++
  console.log('\nDistribution nb critères utilisés pour le calcul :')
  for (const [k, v] of Object.entries(distNbCrit)) console.log(`  ${k} critère(s) : ${v} éval(s)`)

  // Distribution diffs
  const buckets: Record<string, number> = { '≤0.5': 0, '0.5–1.0': 0, '1.0–1.5': 0, '>1.5': 0 }
  for (const u of updates) {
    const d = Math.abs(u.newMoyenne - (u.oldMoyenne ?? 0))
    if (d <= 0.5) buckets['≤0.5']++
    else if (d <= 1.0) buckets['0.5–1.0']++
    else if (d <= 1.5) buckets['1.0–1.5']++
    else buckets['>1.5']++
  }
  console.log('\nDistribution des changements :')
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(10)} : ${v}`)

  if (!EXECUTE) {
    console.log('\n🟢 Dry-run terminé. Relancer avec --execute pour appliquer.')
    return
  }

  console.log('\n🔥 EXECUTION ...')
  const backupPath = path.resolve(__dirname, `../docs/backup-fix-firebase-fbzero-20260528-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(updates.map(u => ({
    eval_id: u.evalId, solution: u.sol, rpps: u.rpps, user_nom: u.userNom,
    ancienne_moyenne: u.oldMoyenne, nouvelle_moyenne: u.newMoyenne, nb_criteres_utilises: u.nbCriteresUtilises,
    scores_au_moment_fix: u.scores,
  })), null, 2))
  console.log(`Backup JSON : ${backupPath}`)

  let ok = 0, ko = 0
  for (const u of updates) {
    const { error } = await s.from('evaluations').update({ moyenne_utilisateur: u.newMoyenne }).eq('id', u.evalId)
    if (error) { console.log(`  ❌ ${u.evalId} : ${error.message}`); ko++ }
    else ok++
  }
  console.log(`\n✅ ${ok} updates OK, ${ko} erreurs.`)
}

main().catch(err => { console.error(err); process.exit(1) })
