/**
 * Dépublie un questionnaire de thèse : statut « publie » → « refuse », comme le bouton « Refuser »
 * d'Admin → Études & Thèses (qui le republie d'un clic avec « Publier »). Première utilisation le
 * 2026-11-12 : questionnaire d'essai « Etude sur les corrélations régionales entre la consommation
 * de chips et la violence dans la société » (demande de David).
 *
 * Filet : dry-run par défaut, `--execute` requis ; ligne sauvegardée dans backups/ avant écriture.
 *
 * Usage : npx tsx scripts/depublier-questionnaire.ts <id>            # dry-run
 *         npx tsx scripts/depublier-questionnaire.ts <id> --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const ID = process.argv.slice(2).find((a) => !a.startsWith('--'))
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  if (!ID) throw new Error('Usage : npx tsx scripts/depublier-questionnaire.ts <id> [--execute]')

  const { data: q, error: errLecture } = await supabase.from('questionnaires_these').select('*').eq('id', ID).maybeSingle()
  if (errLecture) throw errLecture
  if (!q) throw new Error(`Aucun questionnaire ${ID}.`)
  console.log('Questionnaire :', { id: q.id, titre: q.titre, statut: q.statut, date_fin: q.date_fin, lien: q.lien })
  if (q.statut !== 'publie') {
    console.log(`Statut « ${q.statut} » : rien à faire.`)
    return
  }
  console.log('À faire : statut « publie » → « refuse ».')
  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const fichier = path.join(dossier, `questionnaire-${q.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(fichier, JSON.stringify(q, null, 2))
  console.log(`Backup : ${fichier}`)

  const { error: errEcriture } = await supabase
    .from('questionnaires_these')
    .update({ statut: 'refuse', updated_at: new Date().toISOString() })
    .eq('id', ID)
    .eq('statut', 'publie')
  if (errEcriture) throw errEcriture

  const { data: relu } = await supabase.from('questionnaires_these').select('statut').eq('id', ID).single()
  console.log(relu?.statut === 'refuse' ? 'Écrit et relu : « refuse ».' : `ÉCHEC : statut relu « ${relu?.statut} ».`)
  if (relu?.statut !== 'refuse') process.exitCode = 1
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
