/**
 * Fix « Ce lien est valable 7 jours » dans le modèle d'email `relance_psc` (2026-10-10).
 *
 * Contexte : le lien de validation (`token_verification`) ne périme pas, la phrase est donc
 * fausse ; elle contredit aussi le rythme d'une relance toutes les 2 semaines. La nouvelle
 * phrase ne cite pas le rythme, pour rester vraie s'il change encore.
 *
 * Périmètre : la seule phrase ci-dessous, dans `email_templates.contenu_html` de `relance_psc`.
 * Refus si elle n'est pas trouvée telle quelle (modèle déjà modifié depuis l'admin).
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 *
 * Usage : npx tsx scripts/fix-modele-relance-psc.ts            # dry-run
 *         npx tsx scripts/fix-modele-relance-psc.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ID = 'relance_psc'
const AVANT = 'Ce lien est valable 7 jours. Relance {{relance_num}}/{{max_relances}}.'
const APRES = 'Nous vous enverrons au plus {{max_relances}} rappels à ce sujet. Celui-ci est le n° {{relance_num}}.'

async function main() {
  console.log(`\n=== Fix modèle ${ID} — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const { data: modele, error } = await supabase.from('email_templates').select('*').eq('id', ID).single()
  if (error) throw error

  const occurrences = modele.contenu_html.split(AVANT).length - 1
  if (occurrences !== 1) {
    console.log(`Phrase attendue trouvée ${occurrences} fois (1 attendue) : rien n'est modifié.`)
    return
  }
  const contenu = modele.contenu_html.replace(AVANT, APRES)

  console.log(`Avant : ${AVANT}`)
  console.log(`Après : ${APRES}`)
  console.log(`Longueur du modèle : ${modele.contenu_html.length} → ${contenu.length} caractères`)

  if (!EXECUTE) {
    console.log('\nDry-run : relancer avec --execute pour écrire.')
    return
  }

  const backupDir = path.resolve(__dirname, '../backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupFile = path.join(backupDir, `modele-${ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(modele, null, 2))
  console.log(`\nBackup : ${backupFile}`)

  const { error: erreurEcriture } = await supabase
    .from('email_templates')
    .update({ contenu_html: contenu, updated_at: new Date().toISOString() })
    .eq('id', ID)
  if (erreurEcriture) throw erreurEcriture

  const { data: relu } = await supabase.from('email_templates').select('contenu_html').eq('id', ID).single()
  const ok = !!relu && relu.contenu_html === contenu
  console.log(ok ? 'Écrit et relu : le modèle contient la nouvelle phrase.' : 'ÉCHEC : le modèle relu ne correspond pas.')
  if (!ok) process.exitCode = 1
}

// Pas de `process.exit()` : sous Windows il fait échouer la fermeture de Node (assertion libuv).
main().catch((e) => { console.error(e); process.exitCode = 1 })
