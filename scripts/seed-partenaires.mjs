import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Lire les variables depuis .env.local
const envPath = join(ROOT, '.env.local')
if (!existsSync(envPath)) {
  console.error('Fichier .env.local introuvable')
  process.exit(1)
}
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const partenaires = [
  { file: 'avenir-spe.png',      nom: 'Avenir Spécialistes',  lien_url: 'https://www.avenir-spe.fr' },
  { file: 'csmf.png',            nom: 'CSMF',                 lien_url: 'https://www.csmf.org' },
  { file: 'fmf.png',             nom: 'FMF',                  lien_url: 'https://www.federation-medecins.org' },
  { file: 'jeunes-medecins.png', nom: 'Jeunes Médecins',      lien_url: 'https://www.jeunesmedecins.fr' },
  { file: 'le-bloc.png',         nom: 'Le Bloc',              lien_url: 'https://www.le-bloc.fr' },
  { file: 'mg-france.png',       nom: 'MG France',            lien_url: 'https://www.mgfrance.org' },
  { file: 'sml.png',             nom: 'SML',                  lien_url: 'https://www.lesml.org' },
  { file: 'snjmg.png',           nom: 'SNJMG',                lien_url: 'https://www.snjmg.org' },
]

async function run() {
  console.log('Uploading logos and seeding partenaires...\n')

  for (let i = 0; i < partenaires.length; i++) {
    const { file, nom, lien_url } = partenaires[i]
    const localPath = join(ROOT, 'public', 'images', 'syndicats', file)

    if (!existsSync(localPath)) {
      console.error(`  ✗ File not found: ${localPath}`)
      continue
    }

    const fileBuffer = readFileSync(localPath)
    const storageKey = `syndicats/${file}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storageKey, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error(`  ✗ Upload failed for ${file}: ${uploadError.message}`)
      continue
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(storageKey)

    const { error: insertError } = await supabase.from('partenaires').insert({
      nom,
      logo_url: publicUrl,
      lien_url,
      actif: true,
      position: i + 1,
    })

    if (insertError) {
      console.error(`  ✗ Insert failed for ${nom}: ${insertError.message}`)
    } else {
      console.log(`  ✓ ${nom} — ${publicUrl}`)
    }
  }

  console.log('\nDone.')
}

run().catch(console.error)
