// Redimensionne et uploade une illustration de catégorie dans Supabase Storage
// Usage : node scripts/upload-category-image.mjs <chemin-image> [largeur]
// Exemple : node scripts/upload-category-image.mjs ~/Desktop/ia-doc.png
// Exemple : node scripts/upload-category-image.mjs ~/Desktop/ia-doc.png 600

import { readFileSync, existsSync } from 'fs'
import { extname, basename } from 'path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET_WIDTH = 600      // px — largeur cible (hauteur proportionnelle)
const MAX_FILE_KB = 300       // Ko — si déjà petit, on skippe la compression

// ── Args ──────────────────────────────────────────────────────────────────────

const [,, inputPath, widthArg] = process.argv

if (!inputPath) {
  console.error('Usage : node scripts/upload-category-image.mjs <chemin-image> [largeur]')
  console.error('Exemple : node scripts/upload-category-image.mjs ~/Desktop/ia-doc.png')
  process.exit(1)
}

const targetWidth = widthArg ? parseInt(widthArg) : TARGET_WIDTH

if (!existsSync(inputPath)) {
  console.error(`❌ Fichier introuvable : ${inputPath}`)
  process.exit(1)
}

// ── Env ───────────────────────────────────────────────────────────────────────

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
)

// ── Traitement ────────────────────────────────────────────────────────────────

const ext = extname(inputPath).toLowerCase()
const originalName = basename(inputPath)

console.log(`\n📂 Fichier : ${originalName}`)

// Lire les métadonnées
const meta = await sharp(inputPath).metadata()
console.log(`📐 Dimensions originales : ${meta.width}×${meta.height}px — ${Math.round(readFileSync(inputPath).length / 1024)} Ko`)

// Redimensionner si nécessaire
let buffer
const needsResize = meta.width > targetWidth || readFileSync(inputPath).length > MAX_FILE_KB * 1024

if (needsResize) {
  console.log(`🔧 Redimensionnement → ${targetWidth}px de large…`)
  buffer = await sharp(inputPath)
    .resize(targetWidth, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  console.log(`✅ Après compression : ${Math.round(buffer.length / 1024)} Ko (WebP)`)
} else {
  buffer = readFileSync(inputPath)
  console.log(`✅ Image déjà optimisée, upload sans modification`)
}

// Nom de fichier unique
const outputExt = needsResize ? '.webp' : ext
const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${outputExt}`
const contentType = needsResize ? 'image/webp' : `image/${ext.replace('.', '')}`

// Upload Supabase
console.log(`\n⬆️  Upload vers Supabase Storage…`)
const { error } = await supabase.storage
  .from('images')
  .upload(fileName, buffer, { contentType, upsert: false })

if (error) {
  console.error(`❌ Erreur upload : ${error.message}`)
  process.exit(1)
}

const { data } = supabase.storage.from('images').getPublicUrl(fileName)

console.log(`\n✅ Upload réussi !`)
console.log(`🔗 URL publique :`)
console.log(`   ${data.publicUrl}`)
console.log(`\n💡 Copie cette URL dans Supabase → table categories → colonne image_url`)
console.log(`   pour la catégorie correspondante.`)
