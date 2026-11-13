/**
 * Remet à zéro les compteurs de relance des évaluations touchées par l'incident du 2026-04-23.
 *
 * Contexte : ce jour-là, la relance « 1 an » est partie par erreur depuis le site de
 * développement (avant le lancement). 267 évaluations en gardent la trace
 * (`last_relance_sent_at` = 23/04, `relance_count` = 1). À la réactivation des rappels, leurs
 * auteurs recevraient d'abord le « Rappel — votre avis est en attente de mise à jour »
 * (`relance_3mois`), qui renvoie à ce mail d'avril. Décision de David (2026-10-10) : compteurs
 * remis à zéro, pour qu'ils reçoivent le premier rappel (`relance_1an`) comme les autres.
 *
 * Périmètre : évaluations dont `last_relance_sent_at` tombe le 2026-04-23 (heure de Paris) →
 * `last_relance_sent_at = null`, `relance_count = 0`. Rien d'autre n'est touché (ni la note,
 * ni sa date).
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 *
 * Usage : npx tsx scripts/fix-compteurs-relance-incident-avril.ts            # dry-run
 *         npx tsx scripts/fix-compteurs-relance-incident-avril.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Le 23/04/2026, heure de Paris (UTC+2).
const DEBUT = '2026-04-22T22:00:00Z'
const FIN = '2026-04-23T22:00:00Z'

async function concernees() {
  const { data, error } = await supabase
    .from('evaluations')
    .select('id, user_id, solution_id, last_date_note, last_relance_sent_at, relance_count')
    .gte('last_relance_sent_at', DEBUT)
    .lt('last_relance_sent_at', FIN)
  if (error) throw error
  return data
}

async function main() {
  console.log(`\n=== Compteurs de relance (incident du 23/04) — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const lignes = await concernees()
  const medecins = new Set(lignes.map((l) => l.user_id)).size
  const compteurs = [...new Set(lignes.map((l) => l.relance_count))].join(', ')
  console.log(`${lignes.length} évaluations (${medecins} médecins), compteurs actuels : ${compteurs || '—'}`)

  if (lignes.length === 0) {
    console.log('Rien à faire.')
    return
  }
  if (!EXECUTE) {
    console.log('\nDry-run : relancer avec --execute pour écrire.')
    return
  }

  const backupDir = path.resolve(__dirname, '../backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupFile = path.join(backupDir, `compteurs-relance-incident-avril-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(lignes, null, 2))
  console.log(`Backup : ${backupFile}`)

  const { error, count } = await supabase
    .from('evaluations')
    .update({ last_relance_sent_at: null, relance_count: 0 }, { count: 'exact' })
    .gte('last_relance_sent_at', DEBUT)
    .lt('last_relance_sent_at', FIN)
  if (error) throw error

  const restantes = (await concernees()).length
  console.log(`${count} évaluations remises à zéro ; il en reste ${restantes} dans le périmètre.`)
  if (count !== lignes.length || restantes !== 0) process.exitCode = 1
}

// Pas de `process.exit()` : sous Windows il fait échouer la fermeture de Node (assertion libuv).
main().catch((e) => { console.error(e); process.exitCode = 1 })
