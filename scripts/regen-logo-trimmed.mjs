// Recrée logo-secondaire-nb-trimmed.png sans l'espace transparent autour
// Le PNG original a du padding transparent intégré qui centrait visuellement le logo
// Usage : node scripts/regen-logo-trimmed.mjs

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

// 1. Convertir le SVG en PNG haute résolution, puis rogner la transparence
const svgBuf = readFileSync(new URL('../public/logos/logo-secondaire-nb.svg', import.meta.url))

const trimmed = await sharp(svgBuf)
  .resize(2115)           // résolution source
  .png()
  .trim({ threshold: 10 }) // rogner les bords transparents
  .resize(400)             // taille finale dans l'email
  .png()
  .toBuffer()

writeFileSync(new URL('../public/logos/logo-secondaire-nb-trimmed.png', import.meta.url), trimmed)
console.log('✅ PNG rogné créé : public/logos/logo-secondaire-nb-trimmed.png')

// 2. Upload sur Supabase Storage
const { error } = await supabase.storage
  .from('images')
  .upload('logos/logo-secondaire-nb-trimmed.png', trimmed, {
    contentType: 'image/png',
    upsert: true,
  })

if (error) {
  console.error('❌ Upload échoué :', error.message)
  process.exit(1)
}

const url = `https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-secondaire-nb-trimmed.png`
console.log('✅ Uploadé sur Supabase Storage')
console.log('   URL :', url)
