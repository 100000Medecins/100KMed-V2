/**
 * Fix #2 : restaurer les commentaires Firebase perdus dans les évaluations Supabase.
 *
 * Détection : pour chaque éval SB matchée par RPPS avec une éval FB,
 *   - SI un score Firebase = chaîne longue (>30 chars) sous une clé hash (= commentaire libre, idTech 50)
 *   - ET scores.commentaire côté SB est vide/absent
 *   → on copie le texte FB dans sb.scores.commentaire
 *
 * BACKUP : JSON dans docs/.
 *
 * Usage :
 *   npx tsx scripts/fix-firebase-commentaires-perdus.ts          # dry-run
 *   npx tsx scripts/fix-firebase-commentaires-perdus.ts --execute # écrit
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

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE' : '🟢 DRY-RUN'}\n`)

  // Critère commentaire Firebase = identifiantTech "50"
  const criteresFbSnap = await firestore.collection('criteres').get()
  let commentaireFbFid: string | null = null
  for (const c of criteresFbSnap.docs) {
    const d = c.data() as any
    if (String(d.identifiantTech) === '50' && d.type === 'commentaire') {
      commentaireFbFid = c.id
      break
    }
  }
  if (!commentaireFbFid) {
    console.log('❌ Critère commentaire Firebase (idTech=50) introuvable.')
    return
  }
  console.log(`Critère commentaire Firebase : _fid=${commentaireFbFid}\n`)

  // Évals Firebase indexées par (solutionFid, idUser)
  const evalsFbSnap = await firestore.collection('evaluations').get()
  const evalsFbBySolUser = new Map<string, any>()
  for (const d of evalsFbSnap.docs) {
    const data = { _fid: d.id, ...(d.data() as any) }
    evalsFbBySolUser.set(`${data.idSolution}|${data.idUser}`, data)
  }

  // Solutions Firebase legacy
  const { data: solutionsSb } = await s
    .from('solutions')
    .select('id, nom')
    .eq('is_firebase_legacy', true)
    .order('nom')

  // Users RPPS (paginé)
  const rppsByUserId = new Map<string, string>()
  const userByRpps = new Map<string, any>()
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data: batch, error } = await s
      .from('users')
      .select('id, prenom, nom, rpps')
      .not('rpps', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!batch || batch.length === 0) break
    for (const u of batch) {
      if ((u as any).rpps) {
        rppsByUserId.set(u.id, String((u as any).rpps))
        userByRpps.set(String((u as any).rpps), u)
      }
    }
    if (batch.length < PAGE) break
    from += PAGE
  }
  console.log(`Users avec RPPS chargés : ${rppsByUserId.size}`)

  type Update = {
    evalId: string
    solutionNom: string
    rpps: string
    userNom: string
    commentText: string
    oldScores: Record<string, any>
    newScores: Record<string, any>
  }
  const updates: Update[] = []

  for (const sol of solutionsSb ?? []) {
    const fbSolKey = NAME_ALIAS_FB[sol.nom] ?? sol.nom
    const { data: evalsSb } = await s
      .from('evaluations')
      .select('id, user_id, scores')
      .eq('solution_id', sol.id)
    if (!evalsSb) continue

    for (const sbEval of evalsSb) {
      if (!sbEval.user_id) continue
      const rpps = rppsByUserId.get(sbEval.user_id)
      if (!rpps) continue
      const fb = evalsFbBySolUser.get(`${fbSolKey}|${rpps}`)
      if (!fb) continue

      const fbComment = fb.scores?.[commentaireFbFid]
      if (typeof fbComment !== 'string' || fbComment.trim().length < 10) continue

      const oldScores = (sbEval.scores ?? {}) as Record<string, any>
      const oldComment = typeof oldScores.commentaire === 'string' ? oldScores.commentaire.trim() : ''
      if (oldComment.length > 0) continue  // déjà un commentaire côté SB → on ne touche pas

      const u = userByRpps.get(rpps)
      const newScores = { ...oldScores, commentaire: fbComment.trim() }

      updates.push({
        evalId: sbEval.id,
        solutionNom: sol.nom,
        rpps,
        userNom: u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : '?',
        commentText: fbComment.trim(),
        oldScores,
        newScores,
      })
    }
  }

  console.log(`=== PLAN ===`)
  console.log(`Commentaires à restaurer : ${updates.length}\n`)
  for (const u of updates) {
    console.log(`  - ${u.solutionNom} | ${u.userNom} (rpps=${u.rpps}) | "${u.commentText.slice(0, 100).replace(/\n/g, ' ')}${u.commentText.length > 100 ? '…' : ''}"`)
  }

  if (!EXECUTE) {
    console.log('\n🟢 Dry-run terminé. Relancer avec --execute pour appliquer.')
    return
  }

  if (updates.length === 0) {
    console.log('\nRien à faire.')
    return
  }

  console.log('\n🔥 EXECUTION ...')
  const backupPath = path.resolve(__dirname, `../docs/backup-fix-commentaires-20260528-${Date.now()}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(updates.map(u => ({
    eval_id: u.evalId, solution_nom: u.solutionNom, rpps: u.rpps, user_nom: u.userNom,
    anciens_scores: u.oldScores, nouveaux_scores: u.newScores,
  })), null, 2))
  console.log(`Backup JSON : ${backupPath}`)

  let ok = 0, ko = 0
  for (const u of updates) {
    const { error } = await s
      .from('evaluations')
      .update({ scores: u.newScores })
      .eq('id', u.evalId)
    if (error) { console.log(`  ❌ ${u.evalId} : ${error.message}`); ko++ }
    else ok++
  }
  console.log(`\n✅ ${ok} updates OK, ${ko} erreurs.`)
}

main().catch(err => { console.error(err); process.exit(1) })
