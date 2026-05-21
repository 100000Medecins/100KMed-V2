// Génère les emails de lancement « clé en main » — un fichier HTML par syndicat membre.
// Chaque syndicat enverra son fichier depuis son propre outil d'emailing.
//
// Squelette : reprend formellement le template `master_layout` (fond navy dégradé,
// logo officiel en-tête, carte blanche, barre accent) + le pied de page logo des
// emails transactionnels (cf. `etude_clinique`).
// Source des « mots des présidents » : pages_statiques.metadata (slug « qui-sommes-nous »).
// Sortie : tmp/lancement-syndicats/*.html (gitignoré) + _index.html (aperçu des 7).
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

const S = 'https://www.100000medecins.org'
const SUBJECT = 'Le nouveau 100 000 Médecins est là ✨'
const EXCLURE = ['mg-france'] // syndicats non diffusés à ce stade

// Assets servis depuis le storage Supabase (fiables en email, PNG)
const STORAGE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images'
const LOGO_HEADER = `${STORAGE}/logos/logo-secondaire-couleur-trimmed.png`
const LOGO_FOOTER = `${STORAGE}/logos/logo-principal-couleur-trimmed.png`

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Fond navy + dégradés radiaux — valeurs reprises telles quelles du master_layout
const BG = `background-color:#0f1e38;background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

// ── Construction du HTML pour un syndicat ──────────────────────────────────────
function buildHtml(s) {
  const utm = `utm_source=${encodeURIComponent(s.id)}&utm_medium=email&utm_campaign=lancement-2026`
  const logoSyndicat = `${STORAGE}/syndicats/${s.id}.png`
  const nom = esc(s.nom)
  const citation = esc(s.citation)
  const presidents = esc(s.presidents)
  const fonction = `${esc(s.titre)} · ${esc(s.nom_complet)}`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;${BG};">
<!-- Préheader masqué -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Design repensé, nouvelles catégories, partenariats inédits — découvrez le nouveau 100 000 Médecins.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- ══ LOGO EN-TÊTE (master_layout) ══ -->
      <tr>
        <td style="padding:0 0 20px;">
          <a href="${S}/?${utm}" style="text-decoration:none;display:block;line-height:0;">
            <img src="${LOGO_HEADER}" alt="100 000 Médecins" width="276" style="display:block;width:276px;height:auto;border:0;" />
          </a>
        </td>
      </tr>

      <!-- ══ CARTE BLANCHE (master_layout) ══ -->
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">

                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Nouveau site</p>
                <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.5px;">Le nouveau 100&nbsp;000 Médecins est là ✨</h1>

                <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Chère consœur, cher confrère,</p>
                <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">
                  Nous avons entièrement repensé la plateforme <strong style="color:#0f1e38;">100&nbsp;000 Médecins</strong> — design pimpé, nouvelles catégories de solutions (agendas en ligne, IA…), et partenariats inédits.
                </p>
                <p style="margin:0 0 4px;font-size:14px;color:#4A5568;line-height:1.8;">
                  Chaque avis compte : c'est grâce à des retours comme le vôtre que vos confrères font de meilleurs choix — et que les éditeurs sont poussés à améliorer leurs produits.
                </p>

                <!-- ── Mot du président (encart) ── -->
                <div style="margin:24px 0;background:#F4F6FB;border-radius:14px;padding:24px 26px;">
                  <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Message de votre syndicat</p>
                  <img src="${logoSyndicat}" alt="${nom}" height="44" style="display:block;height:44px;width:auto;max-width:160px;object-fit:contain;margin:0 0 14px;" />
                  <p style="margin:0 0 16px;font-size:14px;font-style:italic;color:#3a4256;line-height:1.85;">«&nbsp;${citation}&nbsp;»</p>
                  <table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;">
                    <tr><td style="padding-top:14px;">
                      <p style="margin:0;font-size:13px;font-weight:700;color:#0f1e38;">${presidents}</p>
                      <p style="margin:3px 0 0;font-size:12px;color:#94a3b8;">${fonction}</p>
                    </td></tr>
                  </table>
                </div>

                <!-- ── CTA ── -->
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#0f1e38;border-radius:12px;">
                      <a href="${S}/?${utm}" style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">Découvrir la plateforme&nbsp;→</a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ══ NOTE MULTI-LISTES ══ -->
      <tr>
        <td style="padding:22px 6px 18px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.40);line-height:1.7;text-align:center;">
            Vous recevez ce message en tant qu'adhérent ou sympathisant de ${nom}. Plusieurs organisations soutiennent 100&nbsp;000 Médecins : si vous le recevez plusieurs fois, merci de votre indulgence — c'est le signe d'une mobilisation large de la profession.
          </p>
        </td>
      </tr>

      <!-- ══ LOGO PIED DE PAGE ══ -->
      <tr>
        <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding:18px 0 0;">
          <a href="${S}/?${utm}" style="display:inline-block;text-decoration:none;line-height:0;">
            <img src="${LOGO_FOOTER}" alt="100 000 Médecins" width="120" style="display:block;margin:0 auto;width:120px;height:auto;border:0;" />
          </a>
          <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.45);">Cet email vous est adressé par ${nom}.</p>
        </td>
      </tr>
      <!-- Le lien de désinscription est ajouté automatiquement par l'outil d'emailing du syndicat expéditeur. -->

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ── Page d'aperçu (les 7 côte à côte) ──────────────────────────────────────────
function buildIndex(syndicats) {
  const cards = syndicats.map((s) => `
    <div style="display:inline-block;vertical-align:top;margin:12px;">
      <p style="font:600 14px system-ui;margin:0 0 6px;color:#0f1e38;">${esc(s.nom)} — <span style="font-weight:400;color:#64748b;">${esc(s.presidents)}</span></p>
      <iframe src="./${s.id}.html" width="600" height="1060" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;"></iframe>
    </div>`).join('')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Aperçu — emails de lancement syndicats</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui;">
  <h1 style="font-size:20px;color:#0f1e38;">Emails de lancement — aperçu des ${syndicats.length} syndicats</h1>
  <p style="font-size:13px;color:#64748b;">Objet de l'email : <strong>${esc(SUBJECT)}</strong> · Ouvre les fichiers <code>.html</code> individuels pour les transmettre.</p>
  <div style="text-align:center;">${cards}</div>
</body></html>`
}

// ── Main ───────────────────────────────────────────────────────────────────────
const { data, error } = await supabase
  .from('pages_statiques')
  .select('metadata')
  .eq('slug', 'qui-sommes-nous')
  .single()

if (error) {
  console.error('❌ Erreur Supabase :', error.message)
  process.exit(1)
}

const syndicats = (Array.isArray(data.metadata) ? data.metadata : []).filter((s) => !EXCLURE.includes(s.id))
if (syndicats.length === 0) {
  console.error('❌ Aucun syndicat trouvé dans pages_statiques.metadata')
  process.exit(1)
}

const outDir = join(__dirname, '../tmp/lancement-syndicats')
mkdirSync(outDir, { recursive: true })

for (const s of syndicats) {
  writeFileSync(join(outDir, `${s.id}.html`), buildHtml(s), 'utf-8')
  console.log(`✅ ${s.id}.html — ${s.nom} (${s.presidents})`)
}
writeFileSync(join(outDir, '_index.html'), buildIndex(syndicats), 'utf-8')

console.log(`\n📨 Objet de l'email : « ${SUBJECT} »`)
console.log(`📂 ${syndicats.length} fichiers générés dans tmp/lancement-syndicats/`)
console.log(`👁️  Ouvre tmp/lancement-syndicats/_index.html pour tout voir d'un coup.`)
