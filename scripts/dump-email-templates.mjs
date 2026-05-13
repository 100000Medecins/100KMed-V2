// Dump des templates transactionnels depuis la table email_templates
// vers des fichiers locaux dans tmp/email-templates/{id}.html
//
// Usage : node scripts/dump-email-templates.mjs
//
// Personnaliser la liste TEMPLATES ci-dessous au besoin. Par défaut on dump
// les 3 templates "compte / sécurité" pour leur retirer le footer désabo.

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const raw = readFileSync(path.join(ROOT, '.env.local'), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  }),
)

const TEMPLATES = [
  'reinitialisation_mot_de_passe',
  'verification_psc',
  'suppression_compte',
]

const OUT_DIR = path.join(ROOT, 'tmp', 'email-templates')
mkdirSync(OUT_DIR, { recursive: true })

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log(`Dump vers ${OUT_DIR}\n`)

for (const id of TEMPLATES) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, sujet, contenu_html')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`  ❌ ${id} — erreur : ${error.message}`)
    continue
  }
  if (!data) {
    console.error(`  ❌ ${id} — introuvable en base`)
    continue
  }

  const outPath = path.join(OUT_DIR, `${id}.html`)
  writeFileSync(outPath, data.contenu_html ?? '', 'utf-8')
  const size = (data.contenu_html ?? '').length
  console.log(`  ✓ ${id}.html  (sujet: "${data.sujet}", ${size} chars)`)
}

console.log('\nFichiers prêts. Tu peux les ouvrir, je vais les lire.')
