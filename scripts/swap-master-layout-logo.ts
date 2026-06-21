/**
 * Remplace le logo (PNG statique) du master_layout e-mail par le GIF animé.
 *
 * - Cible : email_templates.contenu_html WHERE id = 'master_layout'.
 * - Remplace l'URL du logo PNG par l'URL du GIF (storage Supabase).
 * - BACKUP du contenu_html actuel dans docs/ avant toute écriture.
 *
 * Usage :
 *   npx tsx scripts/swap-master-layout-logo.ts            # dry-run
 *   npx tsx scripts/swap-master-layout-logo.ts --execute  # écrit
 *   npx tsx scripts/swap-master-layout-logo.ts --old=... --new=... --execute
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const getArg = (k: string, d: string) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`))
  return m ? m.split('=')[1] : d
}

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/logos`
// On cible UNIQUEMENT la balise d'en-tête (width=140, display:block) — le footer (width=110,
// display:inline-block) reste statique. On remplace le tag complet pour ne toucher qu'elle.
const OLD_SRC = getArg(
  'old',
  `<img src="${BASE}/logo-principal-couleur-trimmed.png" alt="100 000 Medecins" width="140" style="display:block;width:140px;height:auto;border:0;" />`
)
const NEW_SRC = getArg(
  'new',
  `<img src="${BASE}/logo-anime-transparent-trim.gif" alt="100 000 Medecins" width="140" style="display:block;width:140px;height:auto;border:0;" />`
)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, contenu_html')
    .eq('id', 'master_layout')
    .single()

  if (error || !data) {
    console.error('Impossible de lire master_layout :', error?.message)
    process.exit(1)
  }

  const html: string = data.contenu_html
  const count = html.split(OLD_SRC).length - 1

  console.log(`Ancien src : ${OLD_SRC}`)
  console.log(`Nouveau src: ${NEW_SRC}`)
  console.log(`Occurrences trouvées dans master_layout : ${count}`)

  if (count === 0) {
    console.error("\n⚠️  Aucune occurrence de l'ancien src. Vérifie l'URL --old (le logo a peut-être déjà été changé).")
    process.exit(1)
  }

  const updated = html.split(OLD_SRC).join(NEW_SRC)

  if (!EXECUTE) {
    console.log('\n[DRY-RUN] Rien écrit. Relance avec --execute pour appliquer.')
    return
  }

  // Backup avant écriture
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.resolve(__dirname, `../docs/backup-master-layout-${stamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify({ id: 'master_layout', contenu_html: html }, null, 2))
  console.log(`Backup écrit : ${backupPath}`)

  const { error: upErr } = await supabase
    .from('email_templates')
    .update({ contenu_html: updated })
    .eq('id', 'master_layout')

  if (upErr) {
    console.error('Erreur update :', upErr.message)
    process.exit(1)
  }
  console.log(`\n✅ master_layout mis à jour (${count} occurrence(s) remplacée(s)).`)
}

main()
