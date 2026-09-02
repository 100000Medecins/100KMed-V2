/**
 * Fix « durée d'utilisation = âge de l'avis » (bug remonté par un utilisateur le 2026-09-02
 * sur la fiche MadeForMed).
 *
 * Contexte : le questionnaire enregistre la durée déclarée dans `evaluations.scores.date_debut`
 * (« Depuis combien d'années utilisez-vous ce logiciel ? », stocké AAAA-01-01). Le parcours
 * anonyme → confirmation PSC créait ensuite `solutions_utilisees` avec `date_debut = aujourd'hui`
 * sans jamais relire cette réponse → la fiche publique affichait l'ancienneté de l'avis
 * déguisée en durée d'usage.
 *
 * Ce script recopie la réponse du questionnaire (`scores.date_debut` / `scores.date_fin`)
 * vers `solutions_utilisees`, uniquement quand elle existe ET diffère.
 *
 * ⚠️ Les évaluations SANS durée déclarée (Firebase d'avant la question) ne sont **pas**
 * touchées : leur `date_debut` reste la date de l'éval (décision David 2026-09-02 — ce sera
 * corrigé naturellement si le médecin réévalue). L'affichage public, lui, ne montre plus
 * rien pour elles (cf. `dureeDeclaree` dans src/lib/db/evaluations.ts).
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 *
 * Usage : npx tsx scripts/fix-duree-utilisation.ts            # dry-run
 *         npx tsx scripts/fix-duree-utilisation.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

const jour = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : null)

async function main() {
  console.log(`\n=== Fix durée d'utilisation — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  // 1. Évaluations rattachées à un compte (le flux anonyme n'a pas encore de solutions_utilisees)
  const evals: Any[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('evaluations')
      .select('id, user_id, solution_id, scores, statut')
      .not('user_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) throw error
    evals.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  console.log(`Évaluations rattachées à un compte : ${evals.length}`)

  // 2. Lignes solutions_utilisees correspondantes
  const usages: Any[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('solutions_utilisees')
      .select('id, user_id, solution_id, date_debut, date_fin')
      .range(from, from + PAGE - 1)
    if (error) throw error
    usages.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  const parCle = new Map<string, Any>()
  for (const u of usages) parCle.set(`${u.user_id}|${u.solution_id}`, u)
  console.log(`Lignes solutions_utilisees : ${usages.length}`)

  // 3. Noms de solutions (lisibilité du rapport)
  const { data: sols } = await supabase.from('solutions').select('id, nom')
  const nomSolution = new Map<string, string>((sols ?? []).map((s: Any) => [s.id, s.nom]))

  // 4. Plan
  const plan: Any[] = []
  let sansDeclaration = 0
  let dejaCoherent = 0
  let sansLigneUsage = 0

  for (const ev of evals) {
    const scores = (ev.scores ?? {}) as Record<string, unknown>
    const dateDebut = typeof scores.date_debut === 'string' ? jour(scores.date_debut) : null
    const dateFin = typeof scores.date_fin === 'string' ? jour(scores.date_fin) : null
    if (!dateDebut) { sansDeclaration++; continue }

    const su = parCle.get(`${ev.user_id}|${ev.solution_id}`)
    if (!su) { sansLigneUsage++; continue }

    const patch: Record<string, string> = {}
    if (jour(su.date_debut) !== dateDebut) patch.date_debut = dateDebut
    // date_fin n'est jamais effacée : elle peut aussi venir du bouton « je n'utilise plus »
    // de /mon-compte, hors questionnaire.
    if (dateFin && jour(su.date_fin) !== dateFin) patch.date_fin = dateFin
    if (Object.keys(patch).length === 0) { dejaCoherent++; continue }

    plan.push({
      solutions_utilisees_id: su.id,
      evaluation_id: ev.id,
      solution: nomSolution.get(ev.solution_id) ?? ev.solution_id,
      statut_eval: ev.statut,
      avant: { date_debut: jour(su.date_debut), date_fin: jour(su.date_fin) },
      apres: { date_debut: patch.date_debut ?? jour(su.date_debut), date_fin: patch.date_fin ?? jour(su.date_fin) },
      patch,
    })
  }

  console.log(`\nSans durée déclarée (non touchées, cf. décision 2026-09-02) : ${sansDeclaration}`)
  console.log(`Déjà cohérentes                                             : ${dejaCoherent}`)
  console.log(`Déclarées mais sans ligne solutions_utilisees               : ${sansLigneUsage}`)
  console.log(`À corriger                                                  : ${plan.length}`)

  const parSolution = new Map<string, number>()
  for (const p of plan) parSolution.set(p.solution, (parSolution.get(p.solution) ?? 0) + 1)
  console.log('\nRépartition par solution :')
  for (const [nom, n] of [...parSolution.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${nom}`)
  }

  console.log('\n10 premiers changements :')
  for (const p of plan.slice(0, 10)) {
    console.log(`  ${p.solution.padEnd(28)} ${p.avant.date_debut ?? 'NULL'} → ${p.apres.date_debut}`)
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN terminé — relancer avec --execute pour écrire.')
    return
  }
  if (plan.length === 0) {
    console.log('\nRien à écrire.')
    return
  }

  // 5. Backup AVANT écriture
  const backupDir = path.resolve(__dirname, '../backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupPath = path.join(backupDir, `fix-duree-utilisation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(plan, null, 2))
  console.log(`\nBackup écrit : ${backupPath}`)

  let ok = 0
  let ko = 0
  for (const p of plan) {
    const { error } = await supabase.from('solutions_utilisees').update(p.patch).eq('id', p.solutions_utilisees_id)
    if (error) { ko++; console.error(`  ✗ ${p.solutions_utilisees_id} : ${error.message}`) } else ok++
  }
  console.log(`\nÉcritures : ${ok} OK, ${ko} en erreur.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
