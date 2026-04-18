// Construit le HTML de la newsletter mensuelle avec le design hero gradient validé.
// Claude génère uniquement le contenu (JSON) — ce fichier gère le design.

const S = 'https://www.100000medecins.org'
const SUPABASE_STORAGE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos'
const BG_STYLE = `background-color:#0f1e38;background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

const MAILTO_SUBJECT = encodeURIComponent('Tu connais 100 000 Médecins ?')
const MAILTO_BODY = encodeURIComponent(
`Salut,

Je voulais te parler d'une plateforme que j'utilise : 100 000 Médecins.

Le principe : des médecins évaluent leurs logiciels médicaux (LGC, agenda, dictée IA...), et ça permet à tout le monde de comparer sur la base de vrais retours de terrain — pas de pub, pas de marketing.

Plus on est nombreux, plus c'est utile pour tous.

Jette un œil : ${S}

À bientôt,`
)

export type ArticleItem = {
  titre: string
  extrait?: string | null
  slug: string
  accroche?: string | null
}

export type Item = {
  titre: string
  description?: string | null
  lien?: string | null
  date_fin?: string | null
}

export interface NewsletterContent {
  sujet: string
  intro: string
  conclusion: string
  nouveautes?: string | null
  articles: ArticleItem[]
  etude: Item | null
  questionnaire: Item | null
  moisLabel: string
}

function dateFin(date_fin: string | null | undefined): string {
  if (!date_fin) return ''
  return `<p style="margin:4px 0 8px;font-size:11px;color:#6B7280;">📅 Jusqu'au ${new Date(date_fin).toLocaleDateString('fr-FR')}</p>`
}

function articleCard(a: ArticleItem): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;margin-bottom:8px;">
    <tr><td style="background:linear-gradient(90deg,#4A90D9,#8A5CF6);height:3px;font-size:0;">&nbsp;</td></tr>
    <tr>
      <td style="padding:18px 22px;">
        ${a.accroche ? `<p style="margin:0 0 10px;font-size:12px;font-style:italic;color:#6B7280;line-height:1.6;">${a.accroche}</p>` : ''}
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f1e38;line-height:1.4;">${a.titre}</p>
        ${a.extrait ? `<p style="margin:0 0 12px;font-size:12px;color:#4A5568;line-height:1.65;">${a.extrait.slice(0, 220)}${a.extrait.length > 220 ? '…' : ''}</p>` : ''}
        <a href="${S}/blog/${a.slug}" style="display:inline-block;background:#0f1e38;border-radius:8px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Lire l'article →</a>
      </td>
    </tr>
  </table>`
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
              ${e.description ? `<p style="margin:0 0 6px;font-size:12px;color:#4A5568;line-height:1.65;">${e.description.slice(0, 200)}${e.description.length > 200 ? '…' : ''}</p>` : ''}
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
              ${q.description ? `<p style="margin:0 0 6px;font-size:12px;color:#4A5568;line-height:1.65;">${q.description.slice(0, 200)}${q.description.length > 200 ? '…' : ''}</p>` : ''}
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
  const { intro, conclusion, etude, questionnaire, nouveautes, moisLabel, articles } = data

  const articlesSection = articles.length > 0 ? `
  <tr>
    <td style="padding:0 0 4px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Du côté du blog</p>
      ${articles.map(articleCard).join('')}
    </td>
  </tr>` : ''

  const etudeSection = etude ? `
  <tr>
    <td style="padding:0 0 4px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Étude clinique en cours</p>
      ${etudeCard(etude)}
    </td>
  </tr>` : ''

  const questionnaireSection = questionnaire ? `
  <tr>
    <td style="padding:0 0 4px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Questionnaire de thèse</p>
      ${questionnaireCard(questionnaire)}
    </td>
  </tr>` : ''

  const nouveautesSection = nouveautes?.trim() ? `
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#4A90D9;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:18px 22px;">
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
  <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.45);text-align:center;">
    <a href="{{lien_navigateur}}" style="color:rgba(255,255,255,0.45);text-decoration:underline;">Voir dans le navigateur</a>
  </p>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="padding:0 0 26px;">
      <a href="${S}" style="text-decoration:none;">
        <img src="${SUPABASE_STORAGE}/logo-secondaire-couleur-trimmed.png" alt="100 000 Médecins" width="180" height="43" style="display:block;height:43px;width:auto;" />
      </a>
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

  ${articlesSection}
  ${etudeSection}
  ${questionnaireSection}

  <!-- CARD ÉVALUATIONS -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f1e38;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:18px 22px;">
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

  <!-- CARD PARTAGE -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border-radius:16px;border:1.5px solid #FDE68A;overflow:hidden;">
        <tr><td style="background:#F5A623;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:18px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width:34px;height:34px;border-radius:10px;background:#FEF3C7;text-align:center;line-height:34px;font-size:18px;">📢</div>
                </td>
                <td style="padding-left:12px;" valign="top">
                  <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#0f1e38;">Un confrère devrait connaître la plateforme ?</p>
                  <p style="margin:0 0 10px;font-size:12px;color:#4A5568;line-height:1.65;">La force de 100&nbsp;000 Médecins, c'est le nombre. Si vous pensez à un collègue qui utilise des logiciels au cabinet — un clic suffit pour lui transmettre ce message.</p>
                  <a href="mailto:?subject=${MAILTO_SUBJECT}&body=${MAILTO_BODY}" style="display:inline-block;background:#F5A623;border-radius:8px;padding:9px 16px;font-size:11px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">✉️&nbsp; Transférer à un confrère</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="margin:0 0 10px;">
        <a href="${S}" style="text-decoration:none;">
          <img src="${SUPABASE_STORAGE}/logo-principal-couleur-trimmed.png" alt="100 000 Médecins" width="120" style="display:block;margin:0 auto;width:120px;height:auto;" />
        </a>
      </p>
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);">
        <a href="{{lien_desabonnement}}" style="color:rgba(255,255,255,0.45);text-decoration:underline;">Me désabonner</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
