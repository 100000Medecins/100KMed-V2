// Génère les emails de lancement « clé en main » — un fichier HTML par syndicat membre.
// Chaque syndicat enverra son fichier depuis son propre outil d'emailing.
//
// Source de vérité du HTML : template `lancement_syndicat` dans email_templates
//   (éditable depuis /admin/emails — voir aussi save-lancement-syndicat-template.mjs).
// Source des « mots des présidents » : pages_statiques.metadata (slug « qui-sommes-nous »).
// Sortie : docs/lancement-syndicats/*.html (versionné) + _index.html (aperçu des 7).
//
// Usage : node scripts/generate-lancement-syndicats.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Env ───────────────────────────────────────────────────────────────────────
const raw = readFileSync(join(__dirname, '../.env.local'), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const EXCLURE = ['mg-france'] // syndicats non diffusés à ce stade
const STORAGE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Remplit les placeholders {{...}} du template pour un syndicat donné.
// (Logique identique à src/lib/email/lancement-syndicat.ts côté app.)
function compose(templateHtml, s) {
  const vars = {
    nom_syndicat: esc(s.nom),
    logo_syndicat: `${STORAGE}/syndicats/${s.id}.png`,
    citation: esc(s.citation),
    president_nom: esc(s.presidents),
    president_fonction: `${esc(s.titre)} · ${esc(s.nom_complet)}`,
    utm_source: encodeURIComponent(s.id),
  }
  return templateHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`))
}

function buildIndex(syndicats, subject) {
  const cards = syndicats.map((s) => `
    <div style="display:inline-block;vertical-align:top;margin:12px;">
      <p style="font:600 14px system-ui;margin:0 0 6px;color:#0f1e38;">${esc(s.nom)} — <span style="font-weight:400;color:#64748b;">${esc(s.presidents)}</span></p>
      <iframe src="./${s.id}.html" width="600" height="1060" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;"></iframe>
    </div>`).join('')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Aperçu — emails de lancement syndicats</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui;">
  <h1 style="font-size:20px;color:#0f1e38;">Emails de lancement — aperçu des ${syndicats.length} syndicats</h1>
  <p style="font-size:13px;color:#64748b;">Objet de l'email : <strong>${esc(subject)}</strong> · Ouvre les fichiers <code>.html</code> individuels pour les transmettre.</p>
  <div style="text-align:center;">${cards}</div>
</body></html>`
}

// ── Main ───────────────────────────────────────────────────────────────────────
const [templateRes, pageRes] = await Promise.all([
  supabase.from('email_templates').select('sujet, contenu_html').eq('id', 'lancement_syndicat').maybeSingle(),
  supabase.from('pages_statiques').select('metadata').eq('slug', 'qui-sommes-nous').single(),
])

if (templateRes.error || !templateRes.data) {
  console.error('❌ Template "lancement_syndicat" introuvable. Lance d\'abord : node scripts/save-lancement-syndicat-template.mjs')
  process.exit(1)
}
if (pageRes.error) {
  console.error('❌ Erreur Supabase (pages_statiques) :', pageRes.error.message)
  process.exit(1)
}

const { sujet, contenu_html } = templateRes.data
const syndicats = (Array.isArray(pageRes.data.metadata) ? pageRes.data.metadata : []).filter((s) => !EXCLURE.includes(s.id))
if (syndicats.length === 0) {
  console.error('❌ Aucun syndicat trouvé dans pages_statiques.metadata')
  process.exit(1)
}

const outDir = join(__dirname, '../docs/lancement-syndicats')
mkdirSync(outDir, { recursive: true })

for (const s of syndicats) {
  writeFileSync(join(outDir, `${s.id}.html`), compose(contenu_html, s), 'utf-8')
  console.log(`✅ ${s.id}.html — ${s.nom} (${s.presidents})`)
}
writeFileSync(join(outDir, '_index.html'), buildIndex(syndicats, sujet), 'utf-8')

console.log(`\n📨 Objet de l'email : « ${sujet} »`)
console.log(`📂 ${syndicats.length} fichiers générés dans docs/lancement-syndicats/`)
console.log(`👁️  Ouvre docs/lancement-syndicats/_index.html pour tout voir d'un coup.`)
