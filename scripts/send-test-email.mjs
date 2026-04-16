// Script temporaire — envoie un email de test du mail de lancement
// Usage : node scripts/send-test-email.mjs

import sgMail from '@sendgrid/mail'

// Charge les variables d'environnement depuis .env.local
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
)
const SENDGRID_API_KEY = env['SENDGRID_API_KEY']
const TO = 'david.azerad@100000medecins.org'
const S = 'https://www.100000medecins.org'

const BG = `background-color:#0f1e38;background-image:radial-gradient(ellipse 60% 65% at 10% 70%,rgba(74,144,217,.65) 0%,transparent 100%),radial-gradient(ellipse 50% 60% at 85% 15%,rgba(138,92,246,.55) 0%,transparent 100%),radial-gradient(ellipse 45% 50% at 55% 90%,rgba(16,185,129,.40) 0%,transparent 100%),radial-gradient(ellipse 40% 40% at 75% 65%,rgba(239,68,68,.20) 0%,transparent 100%)`

const CARD = `background:rgba(255,255,255,0.09);border-radius:18px;border:1px solid rgba(255,255,255,0.14);overflow:hidden`
const CARD_INNER = `padding:28px 30px`

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>100 000 Médecins</title>
</head>
<body style="margin:0;padding:0;${BG};">

<table width="100%" cellpadding="0" cellspacing="0" style="${BG};min-height:100%;">
<tr><td align="center" style="padding:32px 12px 48px;">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- ══ LOGO + NAV ══ -->
  <tr>
    <td style="padding:8px 4px 32px;text-align:center;">
      <!-- Logo -->
      <p style="margin:0 0 4px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4A90D9;margin-right:4px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8734A;margin-right:4px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F5A623;margin-right:10px;vertical-align:middle;"></span>
        <span style="font-size:17px;font-weight:700;color:#ffffff;vertical-align:middle;letter-spacing:-0.3px;">100000médecins<span style="color:#4A90D9;">.org</span></span>
      </p>
      <!-- Nav -->
      <p style="margin:14px 0 0;">
        <a href="${S}/solutions" style="font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;margin:0 10px;">Logiciels</a>
        <a href="${S}/mon-compte/mes-evaluations" style="font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;margin:0 10px;">Mes évaluations</a>
        <a href="${S}/mon-compte/etudes-cliniques" style="font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;margin:0 10px;">Études cliniques</a>
        <a href="${S}/mon-compte/questionnaires-these" style="font-size:11px;color:rgba(255,255,255,0.55);text-decoration:none;margin:0 10px;">Questionnaires</a>
      </p>
    </td>
  </tr>

  <!-- ══ CARD HERO ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${CARD};">
        <!-- Bande dégradée -->
        <tr><td style="background:linear-gradient(90deg,#F5A623,#E8734A,#4A90D9,#8A5CF6);height:3px;"></td></tr>
        <tr>
          <td style="${CARD_INNER};">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Nouveauté</p>
            <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.35;">Le nouveau 100&nbsp;000&nbsp;Médecins est là</h1>
            <p style="margin:0 0 14px;font-size:15px;color:#ffffff;line-height:1.0;">Bonjour Dr.&nbsp;AZERAD,</p>
            <p style="margin:0 0 24px;font-size:14px;color:rgba(255,255,255,0.72);line-height:1.75;">
              Nous avons entièrement repensé la plateforme pour vous offrir une expérience plus complète et plus utile au quotidien. Votre avis sur <strong style="color:#ffffff;">MonLogiciel Pro</strong> est toujours là — il suffit d'un clic pour le confirmer ou le mettre à jour.
            </p>
            <!-- Boutons -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#ffffff;border-radius:12px;">
                  <a href="${S}/mon-compte/mes-evaluations" style="display:inline-block;padding:13px 22px;font-size:13px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">✓ Confirmer mon avis en 1 clic</a>
                </td>
                <td width="10"></td>
                <td style="border:1.5px solid rgba(255,255,255,0.35);border-radius:12px;">
                  <a href="${S}/mon-compte/mes-evaluations" style="display:inline-block;padding:11px 20px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;white-space:nowrap;">Réévaluer</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD CATÉGORIES ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${CARD};">
        <tr><td style="background:#4A90D9;height:3px;"></td></tr>
        <tr>
          <td style="${CARD_INNER};">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">📅 Agenda &nbsp;·&nbsp; 🤖 IA documentaire &nbsp;·&nbsp; ✍️ IA scribe</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.72;">Trois nouvelles catégories sont désormais ouvertes. Vous utilisez un outil d'IA pour vos comptes-rendus ou votre secrétariat médical ? Vos confrères attendent votre retour d'expérience.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD ÉTUDES & THÈSES ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${CARD};">
        <tr><td style="background:#10B981;height:3px;"></td></tr>
        <tr>
          <td style="${CARD_INNER};">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">🔬 Études cliniques &amp; questionnaires de thèse</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.72;">En partenariat avec le <strong style="color:#ffffff;">Digital Medical Hub</strong>, vous pouvez désormais participer à des études cliniques et répondre à des questionnaires de thèse. Activez vos préférences dans votre compte pour être notifié des prochaines opportunités.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD VOTRE AVIS ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="${CARD};">
        <tr><td style="background:#8A5CF6;height:3px;"></td></tr>
        <tr>
          <td style="${CARD_INNER};">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">💬 Votre avis, c'est concret</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.72;">Chaque évaluation aide des confrères à mieux choisir leurs outils. Plus nous sommes nombreux à partager notre expérience, plus les données sont fiables — et plus les éditeurs sont tenus d'améliorer leurs produits.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ CARD PARTAGE ══ -->
  <tr>
    <td style="padding:0 0 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(245,166,35,0.12);border-radius:18px;border:1px solid rgba(245,166,35,0.35);overflow:hidden;">
        <tr><td style="background:#F5A623;height:3px;"></td></tr>
        <tr>
          <td style="${CARD_INNER};">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">📢 Un confrère devrait connaître la plateforme ?</p>
            <p style="margin:0 0 18px;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.72;">La force de 100&nbsp;000&nbsp;Médecins repose sur le nombre. Si vous pensez à un collègue qui évalue ou utilise des logiciels médicaux, n'hésitez pas à lui transférer ce message.</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F5A623;border-radius:12px;">
                  <a href="mailto:?subject=D%C3%A9couvrez%20100%20000%20M%C3%A9decins&body=Bonjour%2C%0A%0AJe%20voulais%20vous%20faire%20d%C3%A9couvrir%20100%20000%20M%C3%A9decins%2C%20une%20plateforme%20collaborative%20qui%20permet%20aux%20m%C3%A9decins%20d%27%C3%A9valuer%20et%20comparer%20leurs%20logiciels%20m%C3%A9dicaux.%0A%0AD%C3%A9couvrez-la%20ici%20%3A%20${S}"
                     style="display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">
                    ✉️ Transférer ce mail à un confrère
                  </a>
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
    <td style="text-align:center;padding:0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.06);border-radius:14px;border:1px solid rgba(255,255,255,0.09);">
        <tr>
          <td style="padding:18px 24px;text-align:center;">
            <p style="margin:0 0 8px;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4A90D9;margin-right:3px;vertical-align:middle;"></span>
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#E8734A;margin-right:3px;vertical-align:middle;"></span>
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F5A623;margin-right:7px;vertical-align:middle;"></span>
              <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.60);vertical-align:middle;">100000médecins.org</span>
            </p>
            <p style="margin:0 0 5px;font-size:11px;color:rgba(255,255,255,0.35);">contact@100000medecins.org</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);">
              <a href="${S}/mon-compte/mes-notifications" style="color:rgba(255,255,255,0.35);text-decoration:underline;">Me désabonner des communications</a>
            </p>
          </td>
        </tr>
      </table>
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
  subject: '[TEST v2] Le nouveau 100 000 Médecins est là',
  html,
})
console.log('✅ Email de test v2 envoyé à', TO)
