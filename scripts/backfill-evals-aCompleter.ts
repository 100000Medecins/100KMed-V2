/**
 * Backfill des évaluations « page 1 remplie mais jamais finalisées » (orphelines).
 *
 * Contexte : avant le fix, un brouillon héritait du DEFAULT statut='publiee' sans
 * moyenne_utilisateur ni last_date_note → compté dans nb_notes mais exclu de la note
 * et des témoignages (incohérence carte 9 / témoignages 8). Décision produit :
 * les 5 critères principaux remplis = note valide qui doit compter (cf
 * docs/evaluation-scoring.md, « Cycle de vie & comptabilisation »).
 *
 * Ce script, pour chaque éval ayant les 5 critères principaux mais last_date_note NULL :
 *   - moyenne_utilisateur = moyenne des 5 principaux (base 5)
 *   - last_date_note = created_at (préserve la chronologie)
 *   - solutions_utilisees.statut_evaluation = 'aCompleter' (si pas déjà 'finalisee')
 *
 * Ne recalcule PAS les resultats (revalidatePath inappelable hors Next) → déclencher
 * ensuite POST /api/admin/recalc-solution {all:true}. Les solution_id touchés sont listés.
 *
 * Usage :
 *   npx tsx scripts/backfill-evals-aCompleter.ts            # dry-run
 *   npx tsx scripts/backfill-evals-aCompleter.ts --execute  # écrit en base
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EXECUTE = process.argv.includes('--execute')
const PRINCIPAUX = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

function moyennePrincipaux(scores: Record<string, unknown>): number | null {
  const vals: number[] = []
  for (const k of PRINCIPAUX) {
    const raw = scores[k]
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
    if (isNaN(n) || n <= 0) return null
    vals.push(n)
  }
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

async function main() {
  // Orphelines : statut publiee/null, last_date_note NULL
  const { data: evals, error } = await s
    .from('evaluations')
    .select('id, user_id, solution_id, scores, statut, created_at, moyenne_utilisateur, last_date_note')
    .is('last_date_note', null)
    .or('statut.eq.publiee,statut.is.null')

  if (error) throw error

  const candidates = (evals ?? [])
    .map((e) => ({ row: e, moyenne: moyennePrincipaux((e.scores as Record<string, unknown>) || {}) }))
    .filter((c) => c.moyenne != null)

  const ignored = (evals ?? []).length - candidates.length
  console.log(`Orphelines last_date_note NULL : ${(evals ?? []).length} | valides (5 principaux) : ${candidates.length} | ignorées (incomplètes) : ${ignored}\n`)

  if (candidates.length === 0) {
    console.log('Rien à backfiller.')
    return
  }

  // Backup
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.resolve(__dirname, `../docs/backup-backfill-aCompleter-${stamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(candidates.map((c) => c.row), null, 2), 'utf-8')
  console.log(`📦 Backup : ${path.relative(process.cwd(), backupPath)}\n`)

  console.log(EXECUTE ? '=== EXÉCUTION ===\n' : '=== DRY-RUN ===\n')

  const solutionsTouchees = new Set<string>()

  for (const { row, moyenne } of candidates) {
    solutionsTouchees.add(row.solution_id as string)
    console.log(`• eval ${row.id}  sol=${row.solution_id}`)
    console.log(`   moyenne_utilisateur: NULL → ${moyenne}`)
    console.log(`   last_date_note: NULL → ${row.created_at}`)
    console.log(`   solutions_utilisees.statut_evaluation → 'aCompleter' (si ≠ finalisee)`)

    if (EXECUTE) {
      const { error: e1 } = await s
        .from('evaluations')
        .update({ moyenne_utilisateur: moyenne, last_date_note: row.created_at })
        .eq('id', row.id)
      if (e1) { console.log(`   ❌ eval: ${e1.message}`); continue }

      const { error: e2 } = await s
        .from('solutions_utilisees')
        .update({ statut_evaluation: 'aCompleter' })
        .eq('user_id', row.user_id)
        .eq('solution_id', row.solution_id)
        .neq('statut_evaluation', 'finalisee')
      if (e2) console.log(`   ⚠️ solutions_utilisees: ${e2.message}`)
      console.log('   ✅ écrit')
    }
    console.log('')
  }

  console.log(`Solutions à recalculer (${solutionsTouchees.size}) : ${[...solutionsTouchees].join(', ')}`)
  console.log(
    EXECUTE
      ? `\nTerminé : ${candidates.length} éval(s) backfillée(s). Déclencher ensuite le recalc (POST /api/admin/recalc-solution {all:true}).`
      : `\nDry-run terminé. Relancer avec --execute pour écrire.`,
  )
}

main().catch((e) => { console.error(e); process.exit(1) })
