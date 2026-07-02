/**
 * Seed initial de la table `citations` à partir de la constante front.
 * Insère les 37 citations en statut 'publiee' (propose_par = null = créées par l'équipe).
 *
 * Idempotent : refuse de réinsérer si la table contient déjà des lignes (sauf --force).
 *
 * Prérequis : table `citations` créée (cf SQL fourni en session).
 *
 * Usage :
 *   npx tsx scripts/seed-citations.ts            # dry-run (n'écrit rien)
 *   npx tsx scripts/seed-citations.ts --execute  # écrit en base
 *   npx tsx scripts/seed-citations.ts --execute --force  # insère même si la table est non vide
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { CITATIONS } from '../src/lib/constants/citations'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const FORCE = process.argv.includes('--force')

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const { count, error: countErr } = await s
    .from('citations')
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.error('Erreur accès table citations (créée ?) :', countErr.message)
    process.exit(1)
  }

  console.log(`Table citations : ${count ?? 0} ligne(s) existante(s).`)
  console.log(`Constante front : ${CITATIONS.length} citations à insérer.`)

  if ((count ?? 0) > 0 && !FORCE) {
    console.log('⚠️  Table non vide → seed ignoré (utilise --force pour insérer quand même).')
    process.exit(0)
  }

  const rows = CITATIONS.map((c) => ({
    text: c.text,
    auteur: c.auteur || null,
    statut: 'publiee' as const,
    propose_par: null,
  }))

  if (!EXECUTE) {
    console.log('\n[DRY-RUN] aucune écriture. Aperçu des 3 premières lignes :')
    console.log(rows.slice(0, 3))
    console.log(`\n→ relance avec --execute pour insérer les ${rows.length} citations.`)
    return
  }

  const { error } = await s.from('citations').insert(rows)
  if (error) {
    console.error('Erreur insertion :', error.message)
    process.exit(1)
  }
  console.log(`✅ ${rows.length} citations insérées en statut 'publiee'.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
