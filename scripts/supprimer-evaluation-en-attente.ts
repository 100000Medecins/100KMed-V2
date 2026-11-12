/**
 * Supprime une évaluation déposée sans compte et jamais validée (statut `en_attente_psc`,
 * aucun compte rattaché). Elle n'entre dans aucune note : rien à recalculer.
 *
 * Première utilisation le 2026-11-12 : évaluation d'essai de Weda du 25/06, adresse
 * `dr.azerad+essai46@…`, relancée trois fois par la relance PSC (demande de David).
 *
 * Filet : dry-run par défaut, `--execute` requis ; ligne sauvegardée dans backups/ avant écriture ;
 * refus si l'évaluation est publiée ou rattachée à un compte.
 *
 * Usage : npx tsx scripts/supprimer-evaluation-en-attente.ts <id>            # dry-run
 *         npx tsx scripts/supprimer-evaluation-en-attente.ts <id> --execute  # écrit
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
  if (!ID) throw new Error('Usage : npx tsx scripts/supprimer-evaluation-en-attente.ts <id> [--execute]')

  const { data: ev, error } = await supabase.from('evaluations').select('*, solution:solutions(nom)').eq('id', ID).maybeSingle()
  if (error) throw error
  if (!ev) throw new Error(`Aucune évaluation ${ID}.`)
  console.log('Évaluation :', {
    id: ev.id,
    solution: ev.solution?.nom,
    statut: ev.statut,
    email_temp: ev.email_temp,
    user_id: ev.user_id,
    moyenne: ev.moyenne_utilisateur,
    deposee_le: ev.last_date_note,
    relances_psc: ev.relance_psc_count,
  })
  if (ev.statut !== 'en_attente_psc' || ev.user_id) {
    throw new Error('Refus : seule une évaluation en attente sans compte rattaché peut être supprimée par ce script.')
  }
  console.log('À faire : suppression de la ligne.')
  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const sauvegarde = path.join(dossier, `evaluation-${ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sauvegarde, JSON.stringify(ev, null, 2))
  console.log('Sauvegarde :', sauvegarde)

  const { data: supprimees, error: errSuppr } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', ID)
    .eq('statut', 'en_attente_psc')
    .is('user_id', null)
    .select('id')
  if (errSuppr) throw errSuppr
  const { data: relue } = await supabase.from('evaluations').select('id').eq('id', ID).maybeSingle()
  console.log(`\nLignes supprimées : ${supprimees?.length ?? 0} ; relue après écriture : ${relue ? 'ENCORE PRÉSENTE' : 'absente'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
