/**
 * Configuration Pro Santé Connect (PSC) comme provider OAuth custom.
 *
 * PSC est le service d'authentification des professionnels de santé en France.
 * Il est configuré comme un provider OIDC custom dans Supabase Auth.
 *
 * Configuration requise dans le dashboard Supabase :
 * 1. Aller dans Authentication > Providers
 * 2. Activer un provider OIDC custom (ex: "psc")
 * 3. Configurer :
 *    - Client ID: <fourni par PSC>
 *    - Client Secret: <fourni par PSC>
 *    - Issuer URL: https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet
 *    - Scopes: openid scope_all
 *    - Attribute mapping: preferred_username → rpps
 */

export const PSC_PROVIDER = 'psc' as const

/**
 * URL de base de Pro Santé Connect.
 */
export const PSC_ISSUER = 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet'

/**
 * Extrait le RPPS (identifiant national) depuis les métadonnées utilisateur PSC.
 */
export function extractRppsFromUserMetadata(
  metadata: Record<string, unknown>
): string | null {
  // Le RPPS peut être dans preferred_username ou dans otherIds
  if (metadata.preferred_username) {
    return String(metadata.preferred_username)
  }

  if (metadata.otherIds && Array.isArray(metadata.otherIds)) {
    const rppsEntry = metadata.otherIds.find(
      (entry: { origine?: string }) => entry.origine === 'RPPS'
    )
    if (rppsEntry && typeof rppsEntry === 'object' && 'identifiant' in rppsEntry) {
      return String(rppsEntry.identifiant)
    }
  }

  return null
}
