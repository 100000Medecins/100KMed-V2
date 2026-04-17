// Injecte le logo secondaire NB au début de tout email transactionnel.
// Les templates stockés en Supabase n'ont pas le logo — on l'ajoute ici côté serveur avant envoi.

const S = 'https://www.100000medecins.org'

const LOGO_HEADER = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td>
      <a href="${S}" style="text-decoration:none;">
        <img src="${S}/logos/logo-secondaire-nb-500.png" alt="100 000 Médecins" width="220" height="52" style="display:block;height:52px;width:auto;" />
      </a>
    </td>
  </tr>
</table>`

/**
 * Injecte le logo en haut du <body> de n'importe quel HTML d'email.
 * Si le HTML contient un <body ...>, insère juste après la balise ouvrante.
 * Sinon, préfixe directement.
 */
export function withEmailLogo(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>/i)
  if (bodyMatch) {
    return html.replace(bodyMatch[0], bodyMatch[0] + LOGO_HEADER)
  }
  return LOGO_HEADER + html
}
