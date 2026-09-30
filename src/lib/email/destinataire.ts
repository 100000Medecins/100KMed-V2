/**
 * Adresse à utiliser pour un envoi à un utilisateur, ou `null` s'il n'est pas joignable.
 *
 * - `contact_email` d'abord (c'est l'adresse saisie par le médecin), `email` en repli ;
 * - jamais l'adresse fictive `psc-{rpps}@psc.sante.fr` fabriquée quand Pro Santé Connect
 *   ne fournit pas d'email : elle n'existe pas, l'envoi rebondirait et dégraderait la
 *   réputation d'envoi du domaine.
 */
export function estEmailFictif(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith('@psc.sante.fr')
}

export function adresseEnvoi(user: { email?: string | null; contact_email?: string | null }): string | null {
  for (const candidat of [user.contact_email, user.email]) {
    const adresse = candidat?.trim()
    if (adresse && !estEmailFictif(adresse)) return adresse
  }
  return null
}
