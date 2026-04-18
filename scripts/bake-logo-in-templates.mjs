// Restaure la structure des templates et injecte le logo proprement.
// - Réinsère le wrapper de centrage 580px (supprimé par erreur précédemment)
// - Injecte le logo couleur comme premier <tr> dans le conteneur 580px
// - Remplace les dots footer par le logo image
// Usage : node scripts/bake-logo-in-templates.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const S = 'https://www.100000medecins.org'

const LOGO_DATA_URI = 'data:image/png;base64,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Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//Gq3UR8EoGAWjYBSMguEAGBgYAAAAAP//AwD5tZnAWsqqOQAAAABJRU5ErkJggg=='

// Logo header : 260px, bien dans le conteneur
const LOGO_HEADER = `<tr><td style="padding:20px 0 10px;text-align:left;"><a href="${S}" style="display:block;text-decoration:none;line-height:0;"><img src="${LOGO_DATA_URI}" alt="100 000 Médecins" width="260" height="61" style="display:block;width:260px;height:auto;" /></a></td></tr>`

// Logo footer centré (remplace les dots)
const LOGO_FOOTER_IMG = `<img src="${LOGO_DATA_URI}" alt="100 000 Médecins" width="180" height="42" style="display:block;width:180px;height:auto;margin:0 auto 8px;" />`

// Ancre de l'outer BG table : toujours présente
const BG_ANCHOR = 'background-color:#0f1e38;background-image:radial-gradient'

function processTemplate(html) {
  // ── Étape 1 : Réinsérer le wrapper de centrage 580px s'il manque ──
  if (!html.includes('max-width:580px')) {
    // Trouver la fin du tag de l'outer BG table
    const bgIdx = html.indexOf(BG_ANCHOR)
    if (bgIdx !== -1) {
      const tagEnd = html.indexOf('>', bgIdx) + 1
      const WRAPPER_OPEN = `\n<tr><td align="center" style="padding:24px 16px 48px;">\n<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">\n`
      html = html.slice(0, tagEnd) + WRAPPER_OPEN + html.slice(tagEnd)
    }
  }

  // ── Étape 2 : Injecter le logo header (une seule fois) ──
  if (!html.includes(LOGO_HEADER)) {
    const anchor = 'style="max-width:580px;width:100%;">'
    const idx = html.indexOf(anchor)
    if (idx !== -1) {
      const pos = idx + anchor.length
      html = html.slice(0, pos) + '\n' + LOGO_HEADER + html.slice(pos)
    }
  }

  // ── Étape 3 : Remplacer les dots footer par le logo ──
  const dotIdx = html.indexOf('background:#4A90D9;margin-right:2px')
  if (dotIdx !== -1) {
    const pStart = html.lastIndexOf('<p', dotIdx)
    const pEnd = html.indexOf('</p>', dotIdx) + 4
    if (pStart !== -1 && pEnd > pStart) {
      html = html.slice(0, pStart) +
        `<p style="margin:0 0 8px;text-align:center;">${LOGO_FOOTER_IMG}</p>` +
        html.slice(pEnd)
    }
  }

  return html
}

const { data: templates, error } = await supabase
  .from('email_templates')
  .select('id, contenu_html')

if (error) { console.error('❌', error.message); process.exit(1) }

console.log(`📧 ${templates.length} templates\n`)

for (const t of templates) {
  const newHtml = processTemplate(t.contenu_html)
  const { error: err } = await supabase
    .from('email_templates')
    .update({ contenu_html: newHtml })
    .eq('id', t.id)

  const has580 = newHtml.includes('max-width:580px')
  const hasHeader = newHtml.includes('padding:20px 0 10px')
  const hasFooterLogo = newHtml.includes('margin:0 auto 8px')
  const logoCount = (newHtml.match(/data:image\/png;base64/g) || []).length
  const hasDots = newHtml.includes('background:#4A90D9;margin-right:2px')

  if (err) console.error(`  ❌ ${t.id} — ${err.message}`)
  else console.log(`  ${err ? '❌' : '✅'} ${t.id} — 580px:${has580} header:${hasHeader} footerLogo:${hasFooterLogo} dots:${hasDots} totalLogos:${logoCount}`)
}
