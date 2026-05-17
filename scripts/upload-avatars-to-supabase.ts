/**
 * Upload les 67 avatars finalisés vers Supabase Storage (bucket "avatars", chemin "portraits/").
 *
 * Usage : npx tsx scripts/upload-avatars-to-supabase.ts [--dry-run]
 *
 * Prérequis :
 * - out/avatars/final/avatar-1.png ... avatar-67.png (générés par finalize-avatars.ts)
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env.local
 *
 * Actions :
 * 1. Crée le bucket "avatars" en public si pas existant
 * 2. Upload chaque PNG (upsert = écrase si déjà présent)
 * 3. Affiche les URLs publiques + le SQL prêt à coller dans Supabase SQL Editor
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const SRC_DIR = path.join(process.cwd(), 'out', 'avatars', 'final')
const BUCKET = 'avatars'
const PREFIX = 'portraits'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

async function ensureBucket() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) throw listErr

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists`)
    return
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would create bucket "${BUCKET}" (public)`)
    return
  }

  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error) throw error
  console.log(`Bucket "${BUCKET}" created (public)`)
}

async function uploadOne(filename: string): Promise<string> {
  const filePath = path.join(SRC_DIR, filename)
  const fileBuffer = await fs.readFile(filePath)
  const remotePath = `${PREFIX}/${filename}`

  if (DRY_RUN) {
    console.log(`[dry-run] would upload ${filename} → ${remotePath}`)
  } else {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })
    if (error) throw error
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath)
  return data.publicUrl
}

async function main() {
  console.log(`Source: ${SRC_DIR}`)
  console.log(`Target: ${BUCKET}/${PREFIX}/`)
  console.log(DRY_RUN ? '(DRY RUN — no actual upload)\n' : '')

  await ensureBucket()

  const files = await fs.readdir(SRC_DIR)
  const avatars = files
    .filter((f) => /^avatar-\d+\.png$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/^avatar-(\d+)/)?.[1] ?? 0)
      const nb = Number(b.match(/^avatar-(\d+)/)?.[1] ?? 0)
      return na - nb
    })

  console.log(`\nUploading ${avatars.length} avatars...\n`)

  const urls: Array<{ number: number; url: string }> = []
  for (const filename of avatars) {
    const number = Number(filename.match(/^avatar-(\d+)/)?.[1])
    const url = await uploadOne(filename)
    urls.push({ number, url })
    console.log(`  avatar-${String(number).padStart(2, '0')}.png  →  ${url}`)
  }

  // Output : SQL à exécuter dans Supabase SQL Editor
  console.log('\n' + '='.repeat(70))
  console.log('SQL à exécuter dans Supabase SQL Editor :')
  console.log('='.repeat(70) + '\n')

  console.log('-- 1. Ajouter la colonne display_order (si pas déjà fait)')
  console.log('ALTER TABLE avatars ADD COLUMN IF NOT EXISTS display_order INTEGER;\n')

  console.log('-- 2. Reset des portraits (révoque la migration random + tous anciens choix)')
  console.log('UPDATE users SET portrait = NULL WHERE portrait IS NOT NULL;\n')

  console.log('-- 3. Supprimer les 48 anciens avatars')
  console.log('DELETE FROM avatars;\n')

  console.log('-- 4. Insérer les 67 nouveaux avatars (ordre : médicaux 1-50, décalés 51-67)')
  console.log('INSERT INTO avatars (url, display_order) VALUES')
  const inserts = urls.map(
    ({ number, url }) => `  ('${url}', ${number})`,
  )
  console.log(inserts.join(',\n') + ';')

  // Sauvegarde aussi en JSON pour usage ultérieur
  const mappingPath = path.join(process.cwd(), 'out', 'avatars', 'storage-urls.json')
  await fs.writeFile(mappingPath, JSON.stringify(urls, null, 2))
  console.log(`\n\nURLs sauvegardées dans out/avatars/storage-urls.json`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
