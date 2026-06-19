import { createHmac, timingSafeEqual } from 'crypto'

// TTL du lien de changement d'email : 1 heure
const TTL_SECONDS = 60 * 60

function secret(): string {
  const s = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD
  if (!s) throw new Error('EMAIL_SECRET ou ADMIN_PASSWORD requis')
  return s
}

// Le token lie l'uid ET le nouvel email → un lien valide ne peut pas être rejoué
// vers une autre adresse en modifiant le paramètre `new_email` de l'URL.
function sign(userId: string, newEmail: string, iat: number): string {
  return createHmac('sha256', secret())
    .update(`email-change:${userId}:${newEmail.toLowerCase()}:${iat}`)
    .digest('hex')
}

/** Génère un token HMAC idempotent (rejouable) pour confirmer un changement d'email. */
export function generateEmailChangeToken(userId: string, newEmail: string): { iat: number; token: string } {
  const iat = Math.floor(Date.now() / 1000)
  return { iat, token: sign(userId, newEmail, iat) }
}

export type VerifyResult = 'ok' | 'invalid' | 'expired'

export function verifyEmailChangeToken(
  userId: string,
  newEmail: string,
  iat: number,
  token: string,
): VerifyResult {
  if (!userId || !newEmail || !iat || !token) return 'invalid'
  const expected = sign(userId, newEmail, iat)
  if (expected.length !== token.length) return 'invalid'
  try {
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'))) return 'invalid'
  } catch {
    return 'invalid'
  }
  const now = Math.floor(Date.now() / 1000)
  if (now - iat > TTL_SECONDS) return 'expired'
  return 'ok'
}
