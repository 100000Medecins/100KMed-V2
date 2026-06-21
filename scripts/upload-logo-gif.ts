/**
 * Upload du GIF animé du logo vers Supabase Storage (bucket `images`, dossier `logos/`),
 * au même endroit que le logo PNG actuel.
 *
 * Usage :
 *   npx tsx scripts/upload-logo-gif.ts            # dry-run (n'envoie rien)
 *   npx tsx scripts/upload-logo-gif.ts --execute  # upload réel (upsert)
 *   npx tsx scripts/upload-logo-gif.ts --file=public/logos/logo-anime-transparent-trim.gif --execute
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const fileArg = process.argv.find((a) => a.startsWith('--file='))
const localPath = fileArg ? fileArg.split('=')[1] : 'public/logos/logo-anime-transparent-trim.gif'

const BUCKET = 'images'
const DEST = `logos/${path.basename(localPath)}`

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const abs = path.resolve(__dirname, '..', localPath)
  if (!fs.existsSync(abs)) {
    console.error(`Fichier introuvable : ${abs}`)
    process.exit(1)
  }
  const buf = fs.readFileSync(abs)
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DEST}`

  console.log(`Source  : ${localPath} (${(buf.length / 1024).toFixed(0)} Ko)`)
  console.log(`Bucket  : ${BUCKET}`)
  console.log(`Chemin  : ${DEST}`)
  console.log(`URL     : ${publicUrl}`)

  if (!EXECUTE) {
    console.log('\n[DRY-RUN] Rien envoyé. Relance avec --execute pour uploader.')
    return
  }

  const { error } = await supabase.storage.from(BUCKET).upload(DEST, buf, {
    contentType: 'image/gif',
    upsert: true,
    cacheControl: '604800', // 7 jours
  })
  if (error) {
    console.error('Erreur upload :', error.message)
    process.exit(1)
  }
  console.log('\n✅ Upload OK →', publicUrl)
}

main()
