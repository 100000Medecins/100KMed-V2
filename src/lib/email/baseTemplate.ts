/**
 * Template HTML de base pour tous les emails transactionnels 100 000 Médecins.
 * Utiliser cette fonction comme point de départ pour tout nouveau mail.
 *
 * Le logo est servi depuis Supabase Storage (fonctionne en aperçu admin et en envoi réel).
 * withEmailLogo() n'est pas nécessaire si on utilise ce template.
 */

const LOGO_URL =
  'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-secondaire-couleur-trimmed.png'

const SITE_URL = 'https://www.100000medecins.org'

export interface BaseEmailOptions {
  /** Petite étiquette au-dessus du titre (ex. "Votre compte", "Évaluation") */
  label?: string
  /** Titre principal dans le header (ex. "Confirmez votre avis") */
  title: string
  /** Sous-titre/accroche sous le titre */
  subtitle?: string
  /** Couleur du header gradient gauche (défaut : navy) */
  headerColorStart?: string
  /** Couleur du header gradient droite (défaut : bleu foncé) */
  headerColorEnd?: string
  /** Contenu HTML de la carte blanche (paragraphes, variables…) */
  body: string
  /** Bouton CTA principal */
  ctaPrimary?: { label: string; href: string }
  /** Bouton CTA secondaire (gris, moins prominent) */
  ctaSecondary?: { label: string; href: string }
  /** Encadré jaune informatif (HTML) */
  infoBox?: string
  /** HTML du pied de mail (désabonnement, note légale…) */
  footer?: string
}

export function buildEmail(opts: BaseEmailOptions): string {
  const {
    label = '100 000 Médecins',
    title,
    subtitle,
    headerColorStart = '#0f1e38',
    headerColorEnd = '#1a3a6e',
    body,
    ctaPrimary,
    ctaSecondary,
    infoBox,
    footer,
  } = opts

  const ctaPrimaryHtml = ctaPrimary
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr><td align="center">
          <a href="${ctaPrimary.href}"
             style="display:inline-block;background:#0f1e38;color:#ffffff;padding:15px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.01em;">
            ${ctaPrimary.label}
          </a>
        </td></tr>
      </table>`
    : ''

  const ctaSecondaryHtml = ctaSecondary
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr><td align="center">
          <a href="${ctaSecondary.href}"
             style="display:inline-block;background:#f3f4f6;color:#0f1e38;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
            ${ctaSecondary.label}
          </a>
        </td></tr>
      </table>`
    : ''

  const infoBoxHtml = infoBox
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:10px;margin-bottom:28px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">${infoBox}</p>
        </td></tr>
      </table>`
    : ''

  const footerHtml = footer
    ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;" />
       <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">${footer}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:32px 12px;">
    <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- Logo -->
      <tr>
        <td style="padding:0 0 16px;">
          <a href="${SITE_URL}" style="text-decoration:none;display:block;">
            <img src="${LOGO_URL}" alt="100 000 Médecins"
                 width="260" style="display:block;width:260px;height:auto;border:0;" />
          </a>
        </td>
      </tr>

      <!-- Header foncé -->
      <tr>
        <td style="background:linear-gradient(135deg,${headerColorStart} 0%,${headerColorEnd} 100%);border-radius:16px 16px 0 0;padding:28px 32px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">${label}</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${title}</p>
          ${subtitle ? `<p style="margin:6px 0 0;font-size:14px;color:#bfdbfe;line-height:1.4;">${subtitle}</p>` : ''}
        </td>
      </tr>

      <!-- Corps blanc -->
      <tr>
        <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;">

          ${body}

          ${ctaPrimaryHtml}
          ${ctaSecondaryHtml}
          ${infoBoxHtml}

          ${footerHtml}

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}
