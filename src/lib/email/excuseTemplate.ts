import { buildEmail } from '@/lib/email/baseTemplate'

export const EXCUSE_DEFAULT_SUJET =
  "Toutes nos excuses — votre lien de réévaluation ({{solution_nom}})"

/**
 * Contenu ÉDITABLE de l'email d'excuse — seule cette partie est modifiée en WYSIWYG.
 * Les boutons CTA, le header et le footer sont dans buildExcuseEmail().
 */
export const EXCUSE_DEFAULT_BODY = `<p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Bonjour {{nom}},</p>

<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">
  Ce matin, nous vous avons envoyé un email vous invitant à confirmer votre avis sur
  <strong style="color:#0f1e38;">{{solution_nom}}</strong>.
  En raison d&apos;un problème technique de notre côté, <strong>le lien contenu dans cet email ne fonctionnait pas</strong>.
</p>

<p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.65;">
  Nous nous en excusons sincèrement. Voici le lien corrigé&nbsp;:
</p>`

/**
 * Construit l'email complet en injectant le corps (body) dans le template de base du site.
 * Appelé aussi bien pour l'aperçu que pour l'envoi réel.
 */
export function buildExcuseEmail(body: string): string {
  return buildEmail({
    label: '',
    title: 'Toutes nos excuses',
    subtitle: 'Un lien ne fonctionnait pas dans notre email de ce matin',
    body,
    ctaPrimary: {
      label: 'Confirmer mon avis en 1 clic &rarr;',
      href: '{{lien_1clic}}',
    },
    ctaSecondary: {
      label: 'Acc&#233;der &#224; mes &#233;valuations',
      href: '{{lien_reevaluation}}',
    },
    infoBox: `<strong>Le bouton &ldquo;Confirmer en 1 clic&rdquo;</strong> valide votre avis actuel sans rien changer &#224; votre &#233;valuation &mdash; c&apos;est simplement pour confirmer que votre retour est toujours d&apos;actualit&#233;.`,
    footer: `Vous recevez cet email car vous avez &#233;valu&#233; un logiciel m&#233;dical sur 100 000 M&#233;decins.<br>
Encore d&#233;sol&#233;s pour la g&#234;ne occasionn&#233;e. &mdash; <strong>L&apos;&#233;quipe 100 000 M&#233;decins</strong><br><br>
<a href="{{lien_desabonnement}}" style="color:#9ca3af;text-decoration:underline;">G&#233;rer mes pr&#233;f&#233;rences de notifications</a>`,
  })
}

// Rétro-compatibilité
export const EXCUSE_DEFAULT_HTML_TEMPLATE = buildExcuseEmail(EXCUSE_DEFAULT_BODY)
