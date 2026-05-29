/**
 * Audit global Firebase ↔ Supabase pour les 24 solutions is_firebase_legacy.
 *
 * Pour chaque solution :
 *   - nombre d'évaluations Firebase
 *   - nombre d'évaluations Supabase
 *   - matchées par RPPS
 *   - évals Firebase non importées (= manquantes côté SB)
 *   - évals SB sans correspondance FB (= post-migration, ne devrait pas être un problème)
 *   - évals avec moyenne_utilisateur divergente (>0.1 vs FB/2)
 *   - évals avec commentaire Firebase perdu (commentaire FB existant + commentaire SB vide)
 *   - évals SB avec scores "ancien format" (clés numériques "1"-"50" présentes)
 *   - évals SB avec critères majeurs manquants (interface/fonctionnalites/fiabilite/editeur/qualite_prix)
 *
 * Lecture seule. Génère docs/audit-evaluations-firebase-vs-supabase.md.
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

const MAJOR_CRITERES = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

function ts(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString()
  if (typeof val === 'string') return val
  return null
}

function hasOldFormatKeys(scores: any): boolean {
  if (!scores || typeof scores !== 'object') return false
  // Ancien format = clés numériques "1"-"99"
  return Object.keys(scores).some(k => /^\d+$/.test(k))
}

function hasCommentaireInScoresHash(scores: any): { hash: string; text: string } | null {
  if (!scores || typeof scores !== 'object') return null
  for (const [k, v] of Object.entries(scores)) {
    // Heuristique : clé de 20 chars (Firebase ID) + valeur string longue
    if (typeof v === 'string' && v.length > 30 && k.length >= 15) {
      return { hash: k, text: v }
    }
  }
  return null
}

async function main() {
  // ─── Solutions Firebase legacy ───
  const { data: solutionsSb } = await s
    .from('solutions')
    .select('id, nom, slug')
    .eq('is_firebase_legacy', true)
    .order('nom')

  if (!solutionsSb || solutionsSb.length === 0) {
    console.log('Aucune solution is_firebase_legacy=true trouvée')
    return
  }
  console.log(`Solutions Firebase legacy : ${solutionsSb.length}\n`)

  // ─── Évaluations Firebase (toutes, on filtrera par idSolution) ───
  const evalsFbSnap = await firestore.collection('evaluations').get()
  const evalsFbAll = evalsFbSnap.docs.map(d => ({ _fid: d.id, ...(d.data() as any) }))
  console.log(`Total évaluations Firebase : ${evalsFbAll.length}`)

  // Index FB par idSolution
  const evalsFbByIdSol = new Map<string, any[]>()
  for (const e of evalsFbAll) {
    const k = e.idSolution
    if (!k) continue
    if (!evalsFbByIdSol.has(k)) evalsFbByIdSol.set(k, [])
    evalsFbByIdSol.get(k)!.push(e)
  }

  // ─── Mapping nom Supabase → idSolution Firebase ───
  // On essaie d'abord par nom direct, puis par alias connus
  // Mapping nom Supabase → _fid Firebase (clé qui apparaît dans evaluations.idSolution)
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

  const allUserIds = new Set<string>()
  for (const sol of solutionsSb) {
    const fbName = NAME_ALIAS_FB[sol.nom] ?? sol.nom
    const evals = evalsFbByIdSol.get(fbName) ?? []
    for (const e of evals) if (e.idUser) allUserIds.add(String(e.idUser))
  }

  // Users Supabase par RPPS (paginé : Supabase plafonne à 1000 rows/requête)
  const usersSbByRpps = new Map<string, any>()
  const PAGE_USERS = 1000
  let usersFrom = 0
  while (true) {
    const { data: batch, error } = await s
      .from('users')
      .select('id, prenom, nom, pseudo, rpps')
      .not('rpps', 'is', null)
      .range(usersFrom, usersFrom + PAGE_USERS - 1)
    if (error) throw error
    if (!batch || batch.length === 0) break
    for (const u of batch) if ((u as any).rpps) usersSbByRpps.set(String((u as any).rpps), u)
    if (batch.length < PAGE_USERS) break
    usersFrom += PAGE_USERS
  }
  console.log(`Users Supabase avec RPPS : ${usersSbByRpps.size}\n`)

  // ─── Audit par solution ───
  type Row = {
    nom: string
    fbName: string
    nbFb: number
    nbSb: number
    matchRpps: number
    fbOnly: number
    sbOnly: number
    moyenneDivergente: number
    commentairesPerdus: number
    ancienFormat: number
    criteresMajeursManquants: number
    detailsFbOnly: Array<{ rpps: string; nom: string; date: string }>
    detailsMoyenneDiv: Array<{ rpps: string; nom: string; fbMoy: number; fbDiv2: number; sbMoy: number; diff: number }>
    detailsCommentairesPerdus: Array<{ rpps: string; nom: string; commentFb: string }>
    detailsAncienFormat: Array<{ rpps: string; nom: string }>
    detailsCriteresManquants: Array<{ rpps: string; nom: string; manquants: string[] }>
  }
  const rows: Row[] = []

  for (const sol of solutionsSb) {
    const fbName = NAME_ALIAS_FB[sol.nom] ?? sol.nom
    const evalsFb = evalsFbByIdSol.get(fbName) ?? []
    const { data: evalsSb } = await s
      .from('evaluations')
      .select('id, user_id, created_at, moyenne_utilisateur, scores')
      .eq('solution_id', sol.id)

    // Index par RPPS
    const fbByRpps = new Map<string, any>()
    for (const e of evalsFb) fbByRpps.set(String(e.idUser), e)
    const sbByRpps = new Map<string, any>()
    for (const e of evalsSb ?? []) {
      const u = usersSbByRpps.get(String((evalsSb ? '' : ''))) // not used like that
      // Get user from user_id
    }
    // Build sbByRpps via user_id → users.rpps
    const sbUserIds = (evalsSb ?? []).map(e => e.user_id).filter(Boolean) as string[]
    const sbUsersMap = new Map<string, any>()
    if (sbUserIds.length) {
      const { data: sbUsers } = await s.from('users').select('id, prenom, nom, pseudo, rpps').in('id', sbUserIds)
      for (const u of sbUsers ?? []) sbUsersMap.set(u.id, u)
    }
    for (const e of evalsSb ?? []) {
      const u = e.user_id ? sbUsersMap.get(e.user_id) : null
      if (u?.rpps) sbByRpps.set(String(u.rpps), { eval: e, user: u })
    }

    const row: Row = {
      nom: sol.nom,
      fbName,
      nbFb: evalsFb.length,
      nbSb: evalsSb?.length ?? 0,
      matchRpps: 0,
      fbOnly: 0,
      sbOnly: 0,
      moyenneDivergente: 0,
      commentairesPerdus: 0,
      ancienFormat: 0,
      criteresMajeursManquants: 0,
      detailsFbOnly: [],
      detailsMoyenneDiv: [],
      detailsCommentairesPerdus: [],
      detailsAncienFormat: [],
      detailsCriteresManquants: [],
    }

    // Comparer
    const allRpps = new Set([...fbByRpps.keys(), ...sbByRpps.keys()])
    for (const rpps of allRpps) {
      const fb = fbByRpps.get(rpps)
      const sbEntry = sbByRpps.get(rpps)
      const sb = sbEntry?.eval
      const sbUser = sbEntry?.user

      if (fb && !sb) {
        row.fbOnly++
        const u = usersSbByRpps.get(rpps)
        row.detailsFbOnly.push({
          rpps,
          nom: u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : '?',
          date: ts(fb.creation)?.slice(0, 10) ?? '?',
        })
        continue
      }
      if (!fb && sb) {
        row.sbOnly++
        continue
      }
      if (fb && sb) {
        row.matchRpps++
        // Comparer moyenne
        const fbMoy = Number(fb.moyenneUtilisateur)
        const fbDiv2 = isFinite(fbMoy) ? Math.round((fbMoy / 2) * 100) / 100 : NaN
        const sbMoy = Number(sb.moyenne_utilisateur)
        if (isFinite(fbDiv2) && isFinite(sbMoy) && Math.abs(sbMoy - fbDiv2) > 0.1) {
          row.moyenneDivergente++
          row.detailsMoyenneDiv.push({
            rpps,
            nom: `${sbUser.prenom ?? ''} ${sbUser.nom ?? ''}`.trim(),
            fbMoy,
            fbDiv2,
            sbMoy,
            diff: Math.round((sbMoy - fbDiv2) * 100) / 100,
          })
        }

        // Vérifier commentaire perdu
        const fbComment = hasCommentaireInScoresHash(fb.scores)
        const sbScores = (sb.scores ?? {}) as Record<string, any>
        const sbHasComment = typeof sbScores.commentaire === 'string' && sbScores.commentaire.trim().length > 0
        if (fbComment && !sbHasComment) {
          row.commentairesPerdus++
          row.detailsCommentairesPerdus.push({
            rpps,
            nom: `${sbUser.prenom ?? ''} ${sbUser.nom ?? ''}`.trim(),
            commentFb: fbComment.text.slice(0, 80),
          })
        }

        // Ancien format (clés numériques)
        if (hasOldFormatKeys(sb.scores)) {
          row.ancienFormat++
          row.detailsAncienFormat.push({
            rpps,
            nom: `${sbUser.prenom ?? ''} ${sbUser.nom ?? ''}`.trim(),
          })
        }

        // Critères majeurs manquants
        const manquants = MAJOR_CRITERES.filter(k => sbScores[k] === undefined || sbScores[k] === null)
        if (manquants.length > 0) {
          row.criteresMajeursManquants++
          row.detailsCriteresManquants.push({
            rpps,
            nom: `${sbUser.prenom ?? ''} ${sbUser.nom ?? ''}`.trim(),
            manquants,
          })
        }
      }
    }

    rows.push(row)
  }

  // ─── Affichage TERMINAL ───
  console.log('═'.repeat(160))
  console.log('Solution                                    | FB | SB | Match | FB-only | SB-only | Moy div | Com perdus | Anc fmt | Maj manquants')
  console.log('─'.repeat(160))
  for (const r of rows) {
    console.log(
      `${r.nom.slice(0, 42).padEnd(42)} | ${String(r.nbFb).padStart(3)} | ${String(r.nbSb).padStart(3)} | ${String(r.matchRpps).padStart(5)} | ${String(r.fbOnly).padStart(7)} | ${String(r.sbOnly).padStart(7)} | ${String(r.moyenneDivergente).padStart(7)} | ${String(r.commentairesPerdus).padStart(10)} | ${String(r.ancienFormat).padStart(7)} | ${String(r.criteresMajeursManquants).padStart(13)}`
    )
  }
  console.log('═'.repeat(160))
  const tot = (k: keyof Row) => rows.reduce((a, r) => a + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0)
  console.log(
    `${'TOTAL'.padEnd(42)} | ${String(tot('nbFb')).padStart(3)} | ${String(tot('nbSb')).padStart(3)} | ${String(tot('matchRpps')).padStart(5)} | ${String(tot('fbOnly')).padStart(7)} | ${String(tot('sbOnly')).padStart(7)} | ${String(tot('moyenneDivergente')).padStart(7)} | ${String(tot('commentairesPerdus')).padStart(10)} | ${String(tot('ancienFormat')).padStart(7)} | ${String(tot('criteresMajeursManquants')).padStart(13)}`
  )

  // ─── Génération du document Markdown ───
  const md: string[] = []
  md.push('# Audit Firebase ↔ Supabase — évaluations')
  md.push('')
  md.push(`> Généré le ${new Date().toISOString().slice(0, 10)}.`)
  md.push(`> Périmètre : ${rows.length} solutions \`is_firebase_legacy = true\`.`)
  md.push('')
  md.push('## Synthèse globale')
  md.push('')
  md.push('| Métrique | Valeur |')
  md.push('|---|---|')
  md.push(`| Évaluations Firebase totales (solutions legacy) | ${tot('nbFb')} |`)
  md.push(`| Évaluations Supabase totales (mêmes solutions) | ${tot('nbSb')} |`)
  md.push(`| Évals présentes des deux côtés (match RPPS) | ${tot('matchRpps')} |`)
  md.push(`| Évals Firebase **non importées** (FB only) | ${tot('fbOnly')} |`)
  md.push(`| Évals Supabase sans pendant FB (post-migration) | ${tot('sbOnly')} |`)
  md.push(`| Évals avec **moyenne_utilisateur divergente** vs FB/2 | ${tot('moyenneDivergente')} |`)
  md.push(`| Évals avec **commentaire Firebase perdu** | ${tot('commentairesPerdus')} |`)
  md.push(`| Évals SB avec **ancien format** (clés numériques "1"-"50") | ${tot('ancienFormat')} |`)
  md.push(`| Évals SB avec **critères majeurs manquants** | ${tot('criteresMajeursManquants')} |`)
  md.push('')
  md.push('## Détail par solution')
  md.push('')
  md.push('| Solution | FB | SB | Match | FB-only | Moy div | Com perdus | Anc fmt | Maj manquants |')
  md.push('|---|--:|--:|--:|--:|--:|--:|--:|--:|')
  for (const r of rows) {
    md.push(`| ${r.nom} | ${r.nbFb} | ${r.nbSb} | ${r.matchRpps} | ${r.fbOnly} | ${r.moyenneDivergente} | ${r.commentairesPerdus} | ${r.ancienFormat} | ${r.criteresMajeursManquants} |`)
  }
  md.push('')

  md.push('## Anomalies détaillées par solution')
  md.push('')
  for (const r of rows) {
    const anyIssue = r.fbOnly + r.moyenneDivergente + r.commentairesPerdus + r.ancienFormat + r.criteresMajeursManquants
    if (anyIssue === 0) continue
    md.push(`### ${r.nom}`)
    md.push('')
    if (r.detailsFbOnly.length) {
      md.push(`**${r.fbOnly} évaluation(s) Firebase non importée(s) :**`)
      md.push('')
      md.push('| RPPS | Nom | Date FB |')
      md.push('|---|---|---|')
      for (const d of r.detailsFbOnly) md.push(`| ${d.rpps} | ${d.nom} | ${d.date} |`)
      md.push('')
    }
    if (r.detailsMoyenneDiv.length) {
      md.push(`**${r.moyenneDivergente} évaluation(s) avec moyenne divergente (>0.1) :**`)
      md.push('')
      md.push('| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |')
      md.push('|---|---|--:|--:|--:|--:|')
      for (const d of r.detailsMoyenneDiv) md.push(`| ${d.rpps} | ${d.nom} | ${d.fbMoy} | ${d.fbDiv2} | ${d.sbMoy} | ${d.diff} |`)
      md.push('')
    }
    if (r.detailsCommentairesPerdus.length) {
      md.push(`**${r.commentairesPerdus} commentaire(s) Firebase perdu(s) :**`)
      md.push('')
      md.push('| RPPS | Nom | Début du commentaire FB |')
      md.push('|---|---|---|')
      for (const d of r.detailsCommentairesPerdus) md.push(`| ${d.rpps} | ${d.nom} | ${d.commentFb.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`)
      md.push('')
    }
    if (r.detailsAncienFormat.length) {
      md.push(`**${r.ancienFormat} évaluation(s) avec scores au format ancien (clés numériques) :**`)
      md.push('')
      md.push('| RPPS | Nom |')
      md.push('|---|---|')
      for (const d of r.detailsAncienFormat) md.push(`| ${d.rpps} | ${d.nom} |`)
      md.push('')
    }
    if (r.detailsCriteresManquants.length) {
      md.push(`**${r.criteresMajeursManquants} évaluation(s) avec critère(s) majeur(s) manquant(s) :**`)
      md.push('')
      md.push('| RPPS | Nom | Manquants |')
      md.push('|---|---|---|')
      for (const d of r.detailsCriteresManquants) md.push(`| ${d.rpps} | ${d.nom} | ${d.manquants.join(', ')} |`)
      md.push('')
    }
  }

  const outPath = path.resolve(__dirname, '../docs/audit-evaluations-firebase-vs-supabase.md')
  fs.writeFileSync(outPath, md.join('\n'), 'utf-8')
  console.log(`\n→ Document écrit : ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
