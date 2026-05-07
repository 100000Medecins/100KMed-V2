// Script temporaire — envoie un email de test du mail de lancement v6
// Usage : node scripts/send-test-email.mjs

import sgMail from '@sendgrid/mail'
import { readFileSync } from 'fs'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const SENDGRID_API_KEY = env['SENDGRID_API_KEY']
const TO = 'david.azerad@100000medecins.org'
const S = 'https://www.100000medecins.org'

// Images catégories (récupérées depuis Supabase)
const IMG_LOGICIELS = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433333609-i5l8n5cx4g.png'
const IMG_AGENDA = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433342670-hszsc70dau.png'
const IMG_IA_DOC = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776432735712-y47ztc96vs.png'
const IMG_IA_SCRIBE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776432724363-xu3f6oy10nb.png'

const MAILTO_SUBJECT = encodeURIComponent("Tu connais 100 000 Médecins ?")
const MAILTO_BODY = encodeURIComponent(
`Salut,

Tu utilises des logiciels au cabinet — LGC, agenda, dictée IA... ? Je voulais te parler d'une plateforme que j'utilise : 100 000 Médecins.

Le principe : des médecins évaluent leurs logiciels médicaux, et ça permet à tout le monde de comparer sur la base de vrais retours de terrain — pas de pub, pas de marketing.

Plus on est nombreux à partager nos expériences, plus c'est utile pour tous (et plus les éditeurs sont obligés de s'améliorer 😄).

Jette un œil, ça vaut le coup : ${S}

À bientôt,`
)

const BG_COLOR = '#0f1e38'
const BG_STYLE = `background-color:${BG_COLOR};background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>100 000 Médecins</title>
</head>
<body style="margin:0;padding:0;${BG_STYLE};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG_STYLE};">
<tr><td align="center" style="padding:24px 16px 48px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- ══ HEADER : Logo gauche + nav droite ══ -->
  <tr>
    <td style="padding:0 0 26px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Logo gauche -->
          <td valign="middle">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4A90D9;margin-right:3px;vertical-align:middle;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8734A;margin-right:3px;vertical-align:middle;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F5A623;margin-right:8px;vertical-align:middle;"></span>
            <span style="font-size:15px;font-weight:700;color:#ffffff;vertical-align:middle;letter-spacing:-0.3px;">100000médecins<span style="color:#4A90D9;">.org</span></span>
          </td>
          <!-- Nav droite — légèrement décalée vers la gauche pour aligner avec le bord du cadre -->
          <td align="right" valign="middle" style="padding-right:22px;">
            <a href="${S}/solutions" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Logiciels</a>
            <a href="${S}/mon-compte/mes-evaluations" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Évaluations</a>
            <a href="${S}/mon-compte/etudes-cliniques" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Études</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD PRINCIPALE ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:36px 40px 30px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Nouveauté</p>
            <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f1e38;line-height:1.2;white-space:nowrap;letter-spacing:-0.5px;">Le nouveau 100&nbsp;000 Médecins est là ✨</h1>
            <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr. AZERAD,</p>
            <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">
              Nous avons entièrement refondu la plateforme — design repensé, nouvelles catégories, partenariats inédits. Et votre avis sur <strong style="color:#0f1e38;">MonLogiciel Pro</strong>, déposé il y a quelques mois, est toujours là. Un clic suffit pour le confirmer ou l'ajuster.
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#4A5568;line-height:1.8;">
              Chaque avis compte : c'est grâce à des retours comme le vôtre que vos confrères font de meilleurs choix — et que les éditeurs sont poussés à améliorer leurs produits.
            </p>
            <!-- Boutons + image sur la même ligne -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="bottom">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#0f1e38;border-radius:12px;">
                        <a href="${S}/mon-compte/mes-evaluations" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">✓&nbsp; Confirmer mon avis en 1 clic</a>
                      </td>
                      <td width="10"></td>
                      <td style="border:2px solid #e2e8f0;border-radius:12px;">
                        <a href="${S}/mon-compte/mes-evaluations" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#0f1e38;text-decoration:none;white-space:nowrap;">Réévaluer</a>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0;">
                  <img src="${IMG_LOGICIELS}" alt="" width="130" style="display:block;width:130px;height:auto;max-height:120px;object-fit:contain;opacity:0.5;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ LABEL NOUVELLES CATÉGORIES ══ -->
  <tr>
    <td style="padding:14px 0 8px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Nouvelles catégories</p>
    </td>
  </tr>

  <!-- Agenda — pleine largeur avec image -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:18px;overflow:hidden;background-color:#0f2550;background-image:linear-gradient(135deg,#0f2550 0%,#1a4a9a 50%,#4A90D9 100%);">
        <tr>
          <td style="padding:26px 28px;" valign="middle" width="58%">
            <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">📅 Agenda médical</p>
            <p style="margin:0 0 14px;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.65;">Doctolib, Maiia, Médistory… Quel agenda s'adapte le mieux à votre pratique ? Délais, ergonomie, tarifs — comparez les avis de vos confrères et faites le bon choix.</p>
            <a href="${S}/solutions/agendas-medicaux" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:8px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer les agendas →</a>
          </td>
          <!-- Image bottom-right comme sur /comparatifs -->
          <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;width:42%;">
            <img src="${IMG_AGENDA}" alt="Agenda médical" width="190" style="display:block;width:190px;height:auto;max-height:150px;object-fit:contain;opacity:0.9;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- IA doc + IA scribe — même hauteur forcée -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- IA documentaire -->
          <td width="49%" valign="top" style="background-color:#3730a3;background-image:linear-gradient(145deg,#2e27a0 0%,#5b52d6 50%,#8A5CF6 100%);border-radius:18px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0" style="min-height:180px;">
              <tr>
                <td style="padding:22px 16px 22px 22px;" valign="middle" width="58%">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">🤖 IA documentaire</p>
                  <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">Comptes-rendus, synthèses, lettres générées par IA. Gagnez du temps sans perdre en qualité.</p>
                  <a href="${S}/solutions/ia-documentaires" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.30);border-radius:20px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer →</a>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;" width="42%">
                  <img src="${IMG_IA_DOC}" alt="IA documentaire" width="85" style="display:block;width:85px;height:auto;max-height:120px;object-fit:contain;opacity:0.9;" />
                </td>
              </tr>
            </table>
          </td>

          <td width="2%"></td>

          <!-- IA scribe -->
          <td width="49%" valign="top" style="background-color:#b03280;background-image:linear-gradient(145deg,#96246e 0%,#d04888 50%,#F08050 100%);border-radius:18px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0" style="min-height:180px;">
              <tr>
                <td style="padding:22px 16px 22px 22px;" valign="middle" width="58%">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">✍️ IA scribe</p>
                  <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">Dictée médicale et transcription en temps réel. Restez concentré sur votre patient.</p>
                  <a href="${S}/solutions/intelligence-artificielle-medecine" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.30);border-radius:20px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer →</a>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;" width="42%">
                  <img src="${IMG_IA_SCRIBE}" alt="IA scribe" width="100" style="display:block;width:100px;height:auto;max-height:130px;object-fit:contain;opacity:0.9;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ LABEL PARTENARIATS ══ -->
  <tr>
    <td style="padding:14px 0 8px;">
      <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Nouveaux partenariats</p>
    </td>
  </tr>

  <!-- Études cliniques DMH -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#10B981;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#ECFDF5;text-align:center;line-height:34px;font-size:18px;">🔬</div>
                </td>
                <td style="padding-left:14px;" valign="top">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Études cliniques — en partenariat avec le <span style="color:#10B981;font-weight:800;">Digital Medical Hub</span></p>
                  <p style="margin:0 0 14px;font-size:13px;color:#4A5568;line-height:1.7;">Des études de recherche en santé numérique qui ont besoin de votre expertise de terrain. Activez les notifications depuis votre compte pour être contacté lors des prochaines études.</p>
                  <a href="${S}/mon-compte/etudes-cliniques" style="display:inline-block;background:#10B981;border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Voir les études en cours →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Questionnaires de thèse -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#8A5CF6;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#F5F3FF;text-align:center;line-height:34px;font-size:18px;">📋</div>
                </td>
                <td style="padding-left:14px;" valign="top">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Questionnaires de thèse</p>
                  <p style="margin:0 0 14px;font-size:13px;color:#4A5568;line-height:1.7;">Des internes en cours de thèse cherchent des praticiens pour répondre à leurs questionnaires de recherche. Quelques minutes de votre temps peuvent faire la différence pour leur travail.</p>
                  <a href="${S}/mon-compte/questionnaires-these" style="display:inline-block;background:#8A5CF6;border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Voir les questionnaires →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD PARTAGE ══ -->
  <tr>
    <td style="padding:4px 0 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border-radius:18px;border:1.5px solid #FDE68A;overflow:hidden;">
        <tr><td style="background:#F5A623;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#FEF3C7;text-align:center;line-height:34px;font-size:18px;">📢</div>
                </td>
                <td style="padding-left:14px;" valign="top">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Un confrère devrait connaître la plateforme ?</p>
                  <p style="margin:0 0 16px;font-size:13px;color:#4A5568;line-height:1.7;">La force de 100&nbsp;000 Médecins repose sur le nombre. Si vous pensez à un collègue qui utilise des logiciels médicaux, transmettez-lui ce message — un clic suffit.</p>
                  <a href="mailto:?subject=${MAILTO_SUBJECT}&body=${MAILTO_BODY}" style="display:inline-block;background:#F5A623;border-radius:10px;padding:11px 20px;font-size:13px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">✉️&nbsp; Transférer ce mail à un confrère</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ FOOTER ══ -->
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="margin:0 0 5px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4A90D9;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#E8734A;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F5A623;margin-right:6px;vertical-align:middle;"></span>
        <span style="font-size:11px;color:rgba(255,255,255,0.35);vertical-align:middle;">100 000 Médecins · contact@100000medecins.org</span>
      </p>
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">
        <a href="${S}/mon-compte/mes-notifications" style="color:rgba(255,255,255,0.25);text-decoration:underline;">Me désabonner des communications</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`

sgMail.setApiKey(SENDGRID_API_KEY)
await sgMail.send({
  to: TO,
  from: 'contact@100000medecins.org',
  subject: '[TEST v16] Le nouveau 100 000 Médecins est là ✨',
  html,
})
console.log('✅ Email de test v6 envoyé à', TO)
