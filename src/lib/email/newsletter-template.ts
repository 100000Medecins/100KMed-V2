// Construit le HTML de la newsletter mensuelle avec le design hero gradient validé.
// Claude génère uniquement le contenu (JSON) — ce fichier gère le design.

const S = 'https://www.100000medecins.org'
const BG_STYLE = `background-color:#0f1e38;background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

type Item = { titre: string; description?: string | null; lien?: string | null; date_fin?: string | null }

export interface NewsletterContent {
  sujet: string
  intro: string
  conclusion: string
  nouveautes?: string | null
  etudes: Item[]
  questionnaires: Item[]
  moisLabel: string
}

function dateFin(date_fin: string | null | undefined): string {
  if (!date_fin) return ''
  return `<p style="margin:0 0 8px;font-size:11px;color:#6B7280;">📅 Jusqu'au ${new Date(date_fin).toLocaleDateString('fr-FR')}</p>`
}

function etudeCard(e: Item): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;margin-bottom:8px;">
    <tr><td style="background:#10B981;height:3px;font-size:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:18px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="36" valign="top">
              <div style="width:34px;height:34px;border-radius:10px;background:#ECFDF5;text-align:center;line-height:34px;font-size:18px;">🔬</div>
            </td>
            <td style="padding-left:12px;" valign="top">
              <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#0f1e38;">${e.titre}</p>
              ${e.description ? `<p style="margin:0 0 8px;font-size:12px;color:#4A5568;line-height:1.65;">${e.description}</p>` : ''}
              ${dateFin(e.date_fin)}
              <a href="${e.lien || S + '/mon-compte/etudes-cliniques'}" style="display:inline-block;background:#10B981;border-radius:8px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">En savoir plus →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function questionnaireCard(q: Item): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;margin-bottom:8px;">
    <tr><td style="background:#8A5CF6;height:3px;font-size:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:18px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="36" valign="top">
              <div style="width:34px;height:34px;border-radius:10px;background:#F5F3FF;text-align:center;line-height:34px;font-size:18px;">📋</div>
            </td>
            <td style="padding-left:12px;" valign="top">
              <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#0f1e38;">${q.titre}</p>
              ${q.description ? `<p style="margin:0 0 8px;font-size:12px;color:#4A5568;line-height:1.65;">${q.description}</p>` : ''}
              ${dateFin(q.date_fin)}
              <a href="${q.lien || S + '/mon-compte/questionnaires-these'}" style="display:inline-block;background:#8A5CF6;border-radius:8px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Participer →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

export function buildNewsletterHtml(data: NewsletterContent): string {
  const { intro, conclusion, etudes, questionnaires, nouveautes, moisLabel } = data

  const etudesSection = etudes.length > 0 ? `
  <tr>
    <td style="padding:0 0 4px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Études cliniques en cours</p>
      ${etudes.map(etudeCard).join('')}
    </td>
  </tr>` : ''

  const questionnairesSection = questionnaires.length > 0 ? `
  <tr>
    <td style="padding:0 0 4px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Questionnaires de thèse</p>
      ${questionnaires.map(questionnaireCard).join('')}
    </td>
  </tr>` : ''

  const nouveautesSection = nouveautes?.trim() ? `
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#4A90D9;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#EFF6FF;text-align:center;line-height:34px;font-size:18px;">🛠</div>
                </td>
                <td style="padding-left:12px;" valign="top">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f1e38;">Ce qui a changé ce mois-ci</p>
                  <p style="margin:0;font-size:12px;color:#4A5568;line-height:1.7;">${nouveautes}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>100 000 Médecins — ${moisLabel}</title>
</head>
<body style="margin:0;padding:0;${BG_STYLE};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG_STYLE};">
<tr><td align="center" style="padding:24px 16px 48px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="padding:0 0 26px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4A90D9;margin-right:3px;vertical-align:middle;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8734A;margin-right:3px;vertical-align:middle;"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F5A623;margin-right:8px;vertical-align:middle;"></span>
            <span style="font-size:15px;font-weight:700;color:#ffffff;vertical-align:middle;letter-spacing:-0.3px;">100000médecins<span style="color:#4A90D9;">.org</span></span>
          </td>
          <td align="right" valign="middle" style="padding-right:22px;">
            <span style="font-size:11px;color:rgba(255,255,255,0.35);">Infos du mois · ${moisLabel}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CARD INTRO -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px 36px 28px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Newsletter · ${moisLabel}</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.3px;">Les infos du mois — 100&nbsp;000 Médecins</h1>
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
            <p style="margin:0;font-size:14px;color:#4A5568;line-height:1.8;">${intro}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${etudesSection}
  ${questionnairesSection}

  <!-- CARD ÉVALUATIONS -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f1e38;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#EFF6FF;text-align:center;line-height:34px;font-size:18px;">⭐</div>
                </td>
                <td style="padding-left:12px;" valign="top">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f1e38;">Votre avis compte</p>
                  <p style="margin:0 0 10px;font-size:12px;color:#4A5568;line-height:1.65;">${conclusion}</p>
                  <a href="${S}/mon-compte/mes-evaluations" style="display:inline-block;background:#0f1e38;border-radius:8px;padding:9px 16px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Voir mes évaluations →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${nouveautesSection}

  <!-- FOOTER -->
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="margin:0 0 5px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4A90D9;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#E8734A;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F5A623;margin-right:6px;vertical-align:middle;"></span>
        <span style="font-size:11px;color:rgba(255,255,255,0.35);vertical-align:middle;">100 000 Médecins · contact@100000medecins.org</span>
      </p>
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">
        <a href="{{lien_desabonnement}}" style="color:rgba(255,255,255,0.25);text-decoration:underline;">Me désabonner</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
