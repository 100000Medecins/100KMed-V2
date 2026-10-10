import { createHmac, timingSafeEqual } from 'crypto'

function jeton(userId: string, solutionId: string): string {
  const secret = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD!
  return createHmac('sha256', secret)
    .update(`${userId}:${solutionId}`)
    .digest('hex')
}

export function jetonRevalidationValide(userId: string, solutionId: string, token: string): boolean {
  const attendu = jeton(userId, solutionId)
  if (attendu.length !== token.length) return false
  try {
    return timingSafeEqual(Buffer.from(attendu, 'hex'), Buffer.from(token, 'hex'))
  } catch {
    return false
  }
}

/**
 * Lien « confirmer mon avis » des emails de relance. Il mène à la page de confirmation
 * (un bouton), pas à l'adresse qui écrit : les antivirus des messageries ouvrent les liens
 * des mails, une revalidation au simple chargement se ferait sans le médecin.
 */
export function generateRevalidationLink(userId: string, solutionId: string, siteUrlOverride?: string): string {
  const siteUrl = siteUrlOverride || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  return `${siteUrl}/confirmer-avis?uid=${userId}&sid=${solutionId}&token=${jeton(userId, solutionId)}`
}
