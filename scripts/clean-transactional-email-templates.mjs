// Retire le footer "Gérer mes notifications" des 3 templates transactionnels
// (reinitialisation_mot_de_passe, verification_psc, suppression_compte).
//
// Usage :
//   node scripts/clean-transactional-email-templates.mjs           → dry-run (affiche ce qui changerait)
//   node scripts/clean-transactional-email-templates.mjs --apply   → écrit en BDD
//
// Raison : ces 3 mails sont transactionnels/sécurité. Un user ne peut pas
// opter-out de leur réception (la page elle-même affiche "Emails de compte
// ne peuvent pas être désactivés"). Le lien "Gérer mes préférences" en
// footer est donc trompeur et provoquait un effet "lien mort" remonté
// par un utilisateur le 13/05.

import { readFileSync } from 'fs'
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

const apply = process.argv.includes('--apply')

// Matche le bloc <p>...</p> qui contient le lien {{lien_desabonnement}}.
// Capture aussi le retour à la ligne et l'indentation qui précèdent
// pour ne pas laisser de ligne vide.
const UNSUB_BLOCK_RE = /\n[ \t]*<p[^>]*>\s*<a\s+href="\{\{lien_desabonnement\}\}"[^>]*>[^<]*<\/a>\s*<\/p>/g

function cleanHtml(html) {
  return html.replace(UNSUB_BLOCK_RE, '')
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log(apply ? '⚡ MODE APPLY — écriture en BDD\n' : '👀 DRY-RUN — relance avec --apply pour écrire en BDD\n')

let changed = 0
let unchanged = 0

for (const id of TEMPLATES) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, contenu_html')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`  ❌ ${id} — erreur lecture : ${error.message}`)
    continue
  }
  if (!data) {
    console.error(`  ❌ ${id} — introuvable en base`)
    continue
  }

  const before = data.contenu_html ?? ''
  const after = cleanHtml(before)

  if (before === after) {
    console.log(`  ⏭  ${id} — déjà propre (footer absent ou déjà retiré)`)
    unchanged++
    continue
  }

  const removedBytes = before.length - after.length
  console.log(`  ✏  ${id} — retire ${removedBytes} caractères (${before.length} → ${after.length})`)

  if (apply) {
    const { error: upErr } = await supabase
      .from('email_templates')
      .update({ contenu_html: after })
      .eq('id', id)
    if (upErr) {
      console.error(`      ❌ UPDATE échec : ${upErr.message}`)
    } else {
      console.log(`      ✓ UPDATE OK`)
      changed++
    }
  } else {
    changed++
  }
}

console.log(`\nRécap : ${changed} ${apply ? 'modifié(s)' : 'à modifier'}, ${unchanged} inchangé(s)`)
if (!apply && changed > 0) {
  console.log('→ Relance avec --apply pour appliquer.')
}
