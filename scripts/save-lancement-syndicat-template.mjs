// Sauvegarde le template `lancement_syndicat` dans email_templates.
// C'est la source de vérité du HTML : éditable depuis /admin/emails, et lue par
// le script generate-lancement-syndicats.mjs pour produire les fichiers clé en main.
//
// Placeholders remplis par syndicat :
//   {{nom_syndicat}} {{logo_syndicat}} {{citation}}
//   {{president_nom}} {{president_fonction}} {{utm_source}}
//   {{article_syndicat}} (ex : "la ", "le ", "" — espace final inclus dans la valeur)
//   {{mot_president_label}} (ex : "Le mot du Président", "Le mot de la Présidente")
//   {{logo_syndicat_cell}} — cellule HTML complète du logo dans l'en-tête (logo + lien
//     + cartouche blanc optionnel + hauteur personnalisée selon logo_height/logo_bg en BDD)
//
// Usage : node scripts/save-lancement-syndicat-template.mjs

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const raw = readFileSync(join(__dirname, '../.env.local'), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const SUBJECT = 'Le nouveau 100 000 Médecins est là ✨'
const S = 'https://www.100000medecins.org'
const STORAGE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images'
const BG = `background-color:#0f1e38;background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`
// UTM conservés sur TOUS les liens du mail (attribution par syndicat via Vercel Web Analytics).
const UTM = `utm_source={{utm_source}}&utm_medium=email&utm_campaign=lancement-2026`
const link = (path) => `${S}${path}${path.includes('?') ? '&' : '?'}${UTM}`
const LINK_HOME = link('/')
const LINK_NOTER = link('/solution/noter')
const LINK_GLOSSAIRE = link('/glossaire')
const LINK_STORIES = link('/stories-tutos')
const LINK_AGENDAS = link('/solutions/agendas-medicaux')
const LINK_SCRIBES = link('/solutions/intelligence-artificielle-medecine')
const LINK_DOCUMENTAIRES = link('/solutions/ia-documentaires')
const LINK_TELEEXPERTISE = link('/solutions/teleexpertise')
const LINK_TELECONSULTATION = link('/solutions/teleconsultation')
const LINK_TELETRANSMISSION = link('/solutions/teletransmission')
const LINK_ETUDES = link('/mon-compte/etudes-cliniques')
const LINK_THESES = link('/mon-compte/questionnaires-these')
const LINK_IDEE = link('/mon-compte/proposer/idee')
// Style des liens inline dans le corps (gras + bleu accent, sans soulignement pour la lisibilité).
const LNK = 'color:#4A90D9;font-weight:700;text-decoration:none;'

const contenu_html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Le nouveau 100 000 Médecins est là</title>
</head>
<body style="margin:0;padding:0;${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Sept ans après la fondation, le site fait peau neuve. Nouvelles catégories, partenariats, et plus encore.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- ══ LOGO SYNDICAT + ♥ + LOGO 100 000 MÉDECINS (3 lignes) ══ -->
      <tr>
        <td style="padding:0 0 24px;" align="center">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="vertical-align:middle;padding:0 14px 0 0;">{{logo_syndicat_cell}}</td>
              <td style="vertical-align:middle;padding:0 14px;font-size:24px;line-height:1;color:#E8734A;" aria-hidden="true">&#x2665;</td>
              <td style="vertical-align:middle;padding:0 0 0 14px;">
                <a href="${LINK_HOME}" style="text-decoration:none;display:block;line-height:0;">
                  <img src="${STORAGE}/logos/logo-principal-couleur-trimmed.png" alt="100 000 Médecins" height="64" style="display:block;height:64px;width:auto;border:0;" />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ══ CARTE BLANCHE ══ -->
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">

                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Nouveau site</p>
                <h1 style="margin:0 0 32px;font-size:26px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.5px;">Le nouveau 100&nbsp;000&nbsp;Médecins est là ✨</h1>

                <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:#0f1e38;">Chère consœur, cher confrère,</p>

                <p style="margin:0 0 14px;font-size:16px;color:#4A5568;line-height:1.7;">
                  En 2019, <strong style="color:#0f1e38;">{{article_syndicat}}{{nom_syndicat}}</strong> a participé à la fondation de l'association <a href="${LINK_HOME}" style="${LNK}">100&nbsp;000&nbsp;Médecins</a>, afin de peser sur les grandes orientations de l'e-santé pour les médecins de ville.
                </p>

                <!-- ── Encart Aujourd'hui (annonce + au programme) — déplacé juste après l'intro ── -->
                <div style="margin:20px 0 26px;background:#F4F6FB;border-radius:14px;padding:24px 26px;">
                  <p style="margin:0 0 14px;font-size:22px;font-weight:800;color:#4A90D9;letter-spacing:-0.3px;line-height:1.2;">Aujourd'hui</p>
                  <p style="margin:0 0 18px;font-size:17px;font-weight:600;color:#0f1e38;line-height:1.5;">
                    Nous sommes particulièrement heureux de vous annoncer la mise en ligne de <a href="${LINK_HOME}" style="color:#4A90D9;font-weight:700;text-decoration:none;">la nouvelle version de 100000Medecins.org</a>&nbsp;!
                  </p>
                  <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f1e38;">Au programme :</p>
                  <ul style="margin:0;padding:0 0 0 22px;font-size:16px;color:#3a4256;line-height:1.7;">
                    <li style="margin:0 0 8px;">De nouvelles catégories pour vous aider au quotidien : <a href="${LINK_AGENDAS}" style="${LNK}">agendas en ligne</a>, <a href="${LINK_SCRIBES}" style="${LNK}">IA «&nbsp;Scribes&nbsp;»</a> et <a href="${LINK_DOCUMENTAIRES}" style="${LNK}">IA Documentaires</a>, mais également <a href="${LINK_TELEEXPERTISE}" style="${LNK}">téléexpertise</a>, <a href="${LINK_TELECONSULTATION}" style="${LNK}">téléconsultation</a>, <a href="${LINK_TELETRANSMISSION}" style="${LNK}">télétransmission</a>…</li>
                    <li style="margin:0 0 8px;">La possibilité de participer à des <a href="${LINK_ETUDES}" style="${LNK}">études cliniques</a> ou des <a href="${LINK_THESES}" style="${LNK}">thèses</a> sur le thème de l'e-santé.</li>
                    <li style="margin:0 0 8px;">Un <a href="${LINK_GLOSSAIRE}" style="${LNK}">glossaire e-santé</a> — particulièrement utile pour les n00bs que nous sommes tous…</li>
                    <li style="margin:0 0 8px;">Des <a href="${LINK_STORIES}" style="${LNK}">stories, tutos et témoignages</a> pour mieux vous situer dans le far-west de l'e-santé.</li>
                    <li style="margin:0 0 0;">Et la proposition indécente de <a href="${LINK_IDEE}" style="${LNK}">soumettre vos idées</a> pour améliorer en continu ce qui, en réalité, est VOTRE site&nbsp;! :-D</li>
                  </ul>
                </div>

                <p style="margin:0 0 12px;font-size:16px;color:#4A5568;line-height:1.7;">
                  Peu de ses avancées ont été rendues publiques, mais on peut mettre à son crédit :
                </p>

                <ul style="margin:0 0 20px;padding:0 0 0 22px;font-size:16px;color:#4A5568;line-height:1.7;">
                  <li style="margin:0 0 8px;">Un premier site d'évaluation des logiciels métier (LGC) en 2022 — près de <strong style="color:#0f1e38;">6 000 confrères</strong>, <strong style="color:#0f1e38;">600 évaluations</strong>.</li>
                  <li style="margin:0 0 8px;">Un « think-tank des médecins geeks » au sein de l'association.</li>
                  <li style="margin:0 0 8px;">Une représentation aux innombrables réunions de l'ANS, de la DNS et de la CNAM&nbsp;: des relations nouées pour une co-construction réelle et apaisée.</li>
                  <li style="margin:0 0 8px;">Des journées de l'e-santé organisées dans des départements de médecine générale, reproductibles toutes spécialités (les contacter).</li>
                  <li style="margin:0 0 8px;">Des participations à des congrès — stands, conférences (idem, les contacter).</li>
                  <li style="margin:0 0 0;">Plus récemment, le co-portage avec la <a href="${LINK_GLOSSAIRE}" style="${LNK}">FEIMA</a> et la <a href="${LINK_GLOSSAIRE}" style="${LNK}">DNS</a> d'un groupe de travail sur… la portabilité des logiciels métiers (oui, oui)&nbsp;: sous peu, <strong style="color:#0f1e38;">l'export gratuit de vos données sous un mois — et l'import sans perte</strong> — sera la règle. Plus d'excuses pour procrastiner un changement de logiciel s'il vous irrite au quotidien ;-)</li>
                </ul>

                <!-- ── CTA (deux boutons, centrés) ── -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#0f1e38;border-radius:12px;padding:0;">
                            <a href="${LINK_HOME}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">Découvrir la nouvelle version&nbsp;→</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#ffffff;border:1.5px solid #0f1e38;border-radius:12px;padding:0;">
                            <a href="${LINK_NOTER}" style="display:inline-block;padding:12.5px 26px;font-size:16px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">Évaluer un logiciel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- ── Citation finale ── -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                  <tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
                </table>
                <p style="margin:14px 0 4px;font-size:16px;font-style:italic;color:#0f1e38;line-height:1.6;text-align:center;font-weight:600;">
                  «&nbsp;Notre avenir passe par le numérique.<br />Mobilisons-nous pour guider sa transformation.&nbsp;»
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 6px;">
                  <tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
                </table>

                <!-- ── Mot du Président (encart, conservé) ── -->
                <div style="margin:24px 0 0;background:#F4F6FB;border-radius:14px;padding:24px 26px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">{{mot_president_label}}</p>
                  <img src="{{logo_syndicat}}" alt="{{nom_syndicat}}" height="44" style="display:block;height:44px;width:auto;max-width:160px;object-fit:contain;margin:0 0 14px;" />
                  <p style="margin:0 0 16px;font-size:16px;font-style:italic;color:#3a4256;line-height:1.8;">«&nbsp;{{citation}}&nbsp;»</p>
                  <table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;">
                    <tr><td style="padding-top:14px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0f1e38;">{{president_nom}}</p>
                      <p style="margin:3px 0 0;font-size:13px;color:#94a3b8;">{{president_fonction}}</p>
                    </td></tr>
                  </table>
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ══ NOTE MULTI-LISTES ══ -->
      <tr>
        <td style="padding:22px 6px 18px;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7;text-align:center;">
            Vous recevez ce message en tant qu'adhérent ou sympathisant de {{article_syndicat}}{{nom_syndicat}}. Plusieurs organisations soutiennent 100&nbsp;000&nbsp;Médecins : si vous le recevez plusieurs fois, merci de votre indulgence — c'est le signe d'une mobilisation large de la profession&nbsp;😉
          </p>
        </td>
      </tr>

      <!-- ══ LOGO PIED DE PAGE ══ -->
      <tr>
        <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding:18px 0 0;">
          <a href="${LINK_HOME}" style="display:inline-block;text-decoration:none;line-height:0;">
            <img src="${STORAGE}/logos/logo-principal-couleur-trimmed.png" alt="100 000 Médecins" width="120" style="display:block;margin:0 auto;width:120px;height:auto;border:0;" />
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.50);">Cet email vous est adressé par {{article_syndicat}}{{nom_syndicat}}.</p>
        </td>
      </tr>
      <!-- Le lien de désinscription est ajouté automatiquement par l'outil d'emailing du syndicat expéditeur. -->

    </table>
  </td></tr>
</table>
</body>
</html>`

const { error } = await supabase
  .from('email_templates')
  .upsert({ id: 'lancement_syndicat', sujet: SUBJECT, contenu_html, updated_at: new Date().toISOString() })

if (error) {
  console.error('❌ Erreur Supabase :', error.message)
  process.exit(1)
}

console.log('✅ Template "lancement_syndicat" sauvegardé dans email_templates.')
console.log('   Placeholders : {{nom_syndicat}} {{article_syndicat}} {{logo_syndicat}} {{logo_syndicat_cell}}')
console.log('                  {{citation}} {{president_nom}} {{president_fonction}}')
console.log('                  {{mot_president_label}} {{utm_source}}')
