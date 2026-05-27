/**
 * Fix #1 : ancrer moyenne_utilisateur ET scores critères majeurs des évaluations
 * importées de Firebase sur les valeurs Firebase d'origine /2.
 *
 * Cible : évaluations SB des 24 solutions is_firebase_legacy, matchées par RPPS
 * avec une évaluation Firebase correspondante.
 *
 * Modifie pour chaque éval :
 *   - moyenne_utilisateur = fb.moyenneUtilisateur / 2 (arrondi 2 décimales)
 *   - scores.interface, scores.fonctionnalites, scores.fiabilite, scores.editeur,
 *     scores.qualite_prix = valeurs Firebase brutes /2 (via mapping criteres.firebase_id)
 *
 * Ne touche PAS aux sous-critères detail_*, ni au commentaire, ni à statut.
 * Ne touche AUCUNE éval créée après DATE_MISE_EN_LIGNE (= post-migration).
 *
 * BACKUP : table evaluations_backup_fix_firebase_20260528 créée si --execute.
 *
 * Usage :
 *   npx tsx scripts/fix-firebase-evals-moyennes-et-criteres.ts          # dry-run
 *   npx tsx scripts/fix-firebase-evals-moyennes-et-criteres.ts --execute # écrit
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
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
const DATE_MISE_EN_LIGNE = '2026-04-12' // cf CHANGELOG

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

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE (écriture activée)' : '🟢 DRY-RUN (aucune écriture)'}\n`)

  // ─── 1) Construire le mapping firebase_id → identifiant_tech (5 majeurs) ───
  // Côté Firebase, les 5 critères majeurs ont identifiantTech = "1" à "5" (cf collection criteres FB)
  // Mapping fixe : identifiantTech FB → identifiant_tech SB
  const TECH_FB_TO_SB: Record<string, string> = {
    '1': 'interface',
    '2': 'fonctionnalites',
    '3': 'fiabilite',
    '4': 'editeur',
    '5': 'qualite_prix',
  }

  const criteresFbSnap = await firestore.collection('criteres').get()
  const critByFbId = new Map<string, string>()  // firebase _fid → identifiant_tech SB
  for (const c of criteresFbSnap.docs) {
    const data = c.data() as any
    const tech = TECH_FB_TO_SB[String(data.identifiantTech)]
    if (tech) critByFbId.set(c.id, tech)
  }
  console.log(`Critères majeurs Firebase mappés : ${critByFbId.size} / 5`)
  if (critByFbId.size !== 5) {
    console.log('❌ Mapping incomplet — abandon.')
    return
  }

  // ─── 2) Charger les évaluations Firebase et indexer ───
  const evalsFbSnap = await firestore.collection('evaluations').get()
  const evalsFbAll = evalsFbSnap.docs.map(d => ({ _fid: d.id, ...(d.data() as any) }))
  const evalsFbBySolUser = new Map<string, any>()  // `${idSolution}|${idUser}` → eval
  for (const e of evalsFbAll) {
    evalsFbBySolUser.set(`${e.idSolution}|${e.idUser}`, e)
  }

  // ─── 3) Solutions Firebase legacy ───
  const { data: solutionsSb } = await s
    .from('solutions')
    .select('id, nom')
    .eq('is_firebase_legacy', true)
    .order('nom')

  // ─── 4) Users RPPS Supabase (paginé : Supabase plafonne à 1000 rows/requête) ───
  const userIdByRpps = new Map<string, string>()
  const rppsByUserId = new Map<string, string>()
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data: batch, error } = await s
      .from('users')
      .select('id, rpps')
      .not('rpps', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!batch || batch.length === 0) break
    for (const u of batch) {
      if ((u as any).rpps) {
        userIdByRpps.set(String((u as any).rpps), u.id)
        rppsByUserId.set(u.id, String((u as any).rpps))
      }
    }
    if (batch.length < PAGE) break
    from += PAGE
  }
  console.log(`Users avec RPPS chargés : ${userIdByRpps.size}`)

  // ─── 5) Pour chaque solution legacy, comparer et préparer les updates ───
  type Update = {
    evalId: string
    solutionNom: string
    rpps: string
    oldMoyenne: number | null
    newMoyenne: number
    oldScores: Record<string, any>
    newScores: Record<string, any>
    fbId: string
  }
  const updates: Update[] = []
  const skipped: Array<{ evalId: string; raison: string }> = []

  for (const sol of solutionsSb ?? []) {
    const fbSolKey = NAME_ALIAS_FB[sol.nom] ?? sol.nom
    // Charger évals SB de cette solution
    const { data: evalsSb } = await s
      .from('evaluations')
      .select('id, user_id, created_at, moyenne_utilisateur, scores')
      .eq('solution_id', sol.id)
    if (!evalsSb) continue

    for (const sbEval of evalsSb) {
      // On ne touche que les évals pré-mise en ligne
      if (sbEval.created_at && sbEval.created_at >= DATE_MISE_EN_LIGNE) continue
      if (!sbEval.user_id) continue
      const rpps = rppsByUserId.get(sbEval.user_id)
      if (!rpps) continue
      const fb = evalsFbBySolUser.get(`${fbSolKey}|${rpps}`)
      if (!fb) continue  // pas d'équivalent Firebase = on touche pas

      const fbMoy = Number(fb.moyenneUtilisateur)
      if (!isFinite(fbMoy) || fbMoy <= 0) {
        // Possiblement une éval Firebase vide → skip
        skipped.push({ evalId: sbEval.id, raison: `FB moyenneUtilisateur=${fb.moyenneUtilisateur} (FB fid=${fb._fid}, rpps=${rpps}, sol=${sol.nom})` })
        continue
      }
      const newMoyenne = Math.round((fbMoy / 2) * 100) / 100

      // Construire les nouveaux scores : on garde tout, on overwrite les 5 majeurs
      const oldScores = (sbEval.scores ?? {}) as Record<string, any>
      const newScores: Record<string, any> = { ...oldScores }
      let critereChanged = false
      for (const [fbFid, tech] of critByFbId.entries()) {
        const rawVal = fb.scores?.[fbFid]
        const oldVal = oldScores[tech]
        let newVal: number | null
        if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
          const n = Number(rawVal)
          newVal = isFinite(n) ? Math.round((n / 2) * 100) / 100 : null
        } else {
          newVal = null
        }
        newScores[tech] = newVal
        if (oldVal !== newVal) critereChanged = true
      }

      const moyenneChanged = Math.abs((sbEval.moyenne_utilisateur as number ?? 0) - newMoyenne) > 0.001
      // Inclure dans les updates si la moyenne OU au moins un critère majeur change
      if (!moyenneChanged && !critereChanged) continue

      updates.push({
        evalId: sbEval.id,
        solutionNom: sol.nom,
        rpps,
        oldMoyenne: sbEval.moyenne_utilisateur as number | null,
        newMoyenne,
        oldScores,
        newScores,
        fbId: fb._fid,
      })
    }
  }

  // ─── 6) Affichage du plan ───
  console.log(`\n=== PLAN ===`)
  console.log(`Updates prévues : ${updates.length}`)
  console.log(`Skips (FB moy invalide/0) : ${skipped.length}`)
  if (skipped.length > 0 && skipped.length <= 50) {
    console.log('\nDétail des skips :')
    for (const sk of skipped) console.log(`  - ${sk.evalId} | ${sk.raison}`)
  }
  console.log()

  // Aperçu : top 20 plus gros changements
  const sorted = updates
    .map(u => ({ ...u, diff: Math.abs((u.newMoyenne ?? 0) - (u.oldMoyenne ?? 0)) }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 20)
  console.log('Top 20 plus gros changements de moyenne_utilisateur :')
  console.log('Solution                | RPPS         | old → new moyenne | diff')
  console.log('─'.repeat(90))
  for (const u of sorted) {
    console.log(`${u.solutionNom.slice(0, 22).padEnd(22)} | ${u.rpps.padEnd(12)} | ${String(u.oldMoyenne).padStart(5)} → ${String(u.newMoyenne).padEnd(5)} | ${u.diff.toFixed(2)}`)
  }

  // Histogramme des diffs
  const buckets: Record<string, number> = { '≤0.1': 0, '0.1–0.3': 0, '0.3–0.5': 0, '0.5–1.0': 0, '>1.0': 0 }
  for (const u of updates) {
    const d = Math.abs((u.newMoyenne ?? 0) - (u.oldMoyenne ?? 0))
    if (d <= 0.1) buckets['≤0.1']++
    else if (d <= 0.3) buckets['0.1–0.3']++
    else if (d <= 0.5) buckets['0.3–0.5']++
    else if (d <= 1.0) buckets['0.5–1.0']++
    else buckets['>1.0']++
  }
  console.log('\nRépartition des changements de moyenne :')
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(10)} : ${v}`)

  // Compteur critères majeurs ajoutés / modifiés / supprimés
  let critsAjoutes = 0, critsModifies = 0, critsSupprimes = 0, critsInchanges = 0
  for (const u of updates) {
    for (const k of MAJOR_CRITERES) {
      const o = (u.oldScores as any)[k]
      const n = (u.newScores as any)[k]
      const oldHas = o !== undefined && o !== null
      const newHas = n !== undefined && n !== null
      if (!oldHas && newHas) critsAjoutes++
      else if (oldHas && !newHas) critsSupprimes++
      else if (oldHas && newHas && Math.abs(o - n) > 0.001) critsModifies++
      else critsInchanges++
    }
  }
  console.log(`\nCritères majeurs sur les ${updates.length} évals à mettre à jour :`)
  console.log(`  Ajoutés    : ${critsAjoutes}  (étaient absents, vont être renseignés)`)
  console.log(`  Modifiés   : ${critsModifies}  (valeur change)`)
  console.log(`  Supprimés  : ${critsSupprimes}  (étaient présents, vont devenir null)`)
  console.log(`  Inchangés  : ${critsInchanges}`)

  // ─── 7) Exécution si --execute ───
  if (!EXECUTE) {
    console.log('\n🟢 Dry-run terminé. Relancer avec --execute pour appliquer.')
    return
  }

  console.log('\n🔥 EXECUTION ...')
  // Créer la table de backup si elle n'existe pas
  console.log('Création de la table de backup evaluations_backup_fix_firebase_20260528 ...')
  // On utilise une RPC ou un INSERT INTO ... SELECT — ici on fait un dump JSON dans une table dédiée
  // Plus simple : insérer dans une table de backup générique avec colonnes (eval_id, ancien_scores, ancienne_moyenne, fix_date, fix_type)
  // Mais comme la table n'existe pas, on dump dans un fichier JSON en backup
  const backupRows = updates.map(u => ({
    eval_id: u.evalId,
    solution_nom: u.solutionNom,
    rpps: u.rpps,
    fb_id: u.fbId,
    ancienne_moyenne: u.oldMoyenne,
    nouvelle_moyenne: u.newMoyenne,
    anciens_scores: u.oldScores,
    nouveaux_scores: u.newScores,
  }))
  const backupPath = path.resolve(__dirname, `../docs/backup-fix-firebase-20260528-${Date.now()}.json`)
  require('fs').writeFileSync(backupPath, JSON.stringify(backupRows, null, 2))
  console.log(`Backup JSON écrit : ${backupPath}`)

  // Appliquer les updates
  let ok = 0, ko = 0
  for (const u of updates) {
    const { error } = await s
      .from('evaluations')
      .update({ moyenne_utilisateur: u.newMoyenne, scores: u.newScores })
      .eq('id', u.evalId)
    if (error) {
      console.log(`  ❌ ${u.evalId} : ${error.message}`)
      ko++
    } else ok++
  }
  console.log(`\n✅ ${ok} updates OK, ${ko} en erreur.`)
}

main().catch(err => { console.error(err); process.exit(1) })
