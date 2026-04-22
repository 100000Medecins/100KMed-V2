// Rogne la transparence de tous les logos SVG → PNG et uploade sur Supabase Storage
// Résout le problème de centrage visuel causé par l'espace transparent intégré dans les SVG
// Usage : node scripts/trim-all-logos.mjs

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const BASE = new URL('../public/logos/', import.meta.url)

// Tous les logos SVG à traiter → nom de sortie (local + Supabase)
const logos = [
  { svg: 'logo-principal-nb.svg',       out: 'logo-principal-nb-trimmed.png' },
  { svg: 'logo-principal-couleur.svg',   out: 'logo-principal-couleur-trimmed.png' },
  { svg: 'logo-secondaire-nb.svg',       out: 'logo-secondaire-nb-trimmed.png' },
  { svg: 'logo-secondaire-couleur.svg',  out: 'logo-secondaire-couleur-trimmed.png' },
]

for (const { svg, out } of logos) {
  const svgBuf = readFileSync(new URL(svg, BASE))

  const trimmed = await sharp(svgBuf)
    .resize(2115)            // résolution source (viewBox width)
    .png()
    .trim({ threshold: 10 }) // rogner l'espace transparent
    .resize(500)             // taille de référence (redimensionnable dans les templates)
    .png()
    .toBuffer()

  writeFileSync(new URL(out, BASE), trimmed)

  const { error } = await supabase.storage
    .from('images')
    .upload(`logos/${out}`, trimmed, { contentType: 'image/png', upsert: true })

  if (error) {
    console.error(`❌ ${out} : ${error.message}`)
  } else {
    console.log(`✅ ${out}`)
    console.log(`   → https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/${out}`)
  }
}

console.log('\nTerminé. Tous les logos sont disponibles sur Supabase Storage.')
