// Sauvegarde le template relance_1an avec logo aligné à gauche de la carte
// Approche : text-align:left sur le td logo (override du cascade center Gmail)
// Usage : node scripts/save-relance1an.mjs

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const S = 'https://www.100000medecins.org'
const BG = `background-color:#0f1e38;background-image:radial-gradient(ellipse 55% 45% at 52% 6%,rgba(74,144,217,0.65) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

// Logos hébergés sur Supabase Storage (compatibles Gmail / Outlook / Apple Mail)
const LOGO_NB  = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-secondaire-nb-trimmed.png'
const LOGO_CLR = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-principal-couleur-500.png'

const contenu_html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>100 000 Médecins</title></head>
<body style="margin:0;padding:0;${BG};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
<tr><td style="padding:16px 16px 20px;">
<!-- align="center" sur la TABLE (pas le td) → centre via margin, sans cascade text-align -->
<table width="580" align="center" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- Logo header : left par défaut car pas de text-align:center hérité -->
  <tr>
    <td style="padding:10px 0 16px;line-height:0;">
      <a href="${S}" style="display:block;text-decoration:none;line-height:0;">
        <img src="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-secondaire-couleur-trimmed.png" alt="100 000 Médecins" width="360" style="display:block;width:360px;height:auto;border:0;" />
      </a>
    </td>
  </tr>

  <!-- Card -->
  <tr>
    <td style="padding:0 0 14px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 40px 36px;">
          <!-- En-tête carte : label + titre à gauche, illustration à droite -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Votre avis a 1 an</p>
                <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">{{solution_nom}} — votre expérience est-elle toujours la même ?</h1>
              </td>
              <td valign="top" width="130" style="padding-left:16px;padding-top:4px;">
                <img src="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433333609-i5l8n5cx4g.png" alt="" width="120" style="display:block;width:120px;height:auto;opacity:0.75;" />
              </td>
            </tr>
          </table>
          <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
          <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Il y a un an, vous avez évalué <strong style="color:#0f1e38;">{{solution_nom}}</strong> sur 100 000 Médecins. Les logiciels évoluent, les mises à jour s'accumulent — votre avis aussi a peut-être changé.</p>
          <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Un clic suffit pour le confirmer. Si tout est toujours valable, votre évaluation restera en ligne. Si quelque chose a changé, vous pouvez l'ajuster en quelques minutes.</p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#0f1e38;border-radius:12px;">
              <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#10003;&nbsp; Confirmer mon avis en 1 clic</a>
            </td>
            <td width="10"></td>
            <td style="border:2px solid #e2e8f0;border-radius:12px;">
              <a href="{{lien_reevaluation}}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#0f1e38;text-decoration:none;white-space:nowrap;">Réévaluer</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding:8px 0 0;">
      <a href="${S}" style="display:inline-block;text-decoration:none;line-height:0;">
        <img src="${LOGO_CLR}" alt="100 000 Médecins" width="120" style="display:block;margin:0 auto;width:120px;height:auto;border:0;" />
      </a>
      <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,0.7);">
        <a href="{{lien_desabonnement}}" style="color:rgba(255,255,255,0.7);text-decoration:underline;">Me désabonner des communications</a>
      </p>
    </td>
  </tr>

</table></td></tr></table>
</body></html>`

const { error } = await supabase
  .from('email_templates')
  .update({ sujet: "Votre avis sur {{solution_nom}} a 1 an — toujours d'actualité ?", contenu_html })
  .eq('id', 'relance_1an')

if (error) {
  console.error('❌ Erreur :', error.message)
  process.exit(1)
}

console.log('✅ Template relance_1an mis à jour.')
console.log('   Logo header : text-align:left sur td (override du cascade center Gmail)')
console.log('   Espacement réduit de moitié (outer top: 12px, logo: 5px/4px padding)')
