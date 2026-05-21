import { createHmac, timingSafeEqual } from 'crypto'

// TTL du lien de réinitialisation de mot de passe : 1 heure
const TTL_SECONDS = 60 * 60

function secret(): string {
  const s = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD
  if (!s) throw new Error('EMAIL_SECRET ou ADMIN_PASSWORD requis')
  return s
}

function sign(userId: string, iat: number): string {
  return createHmac('sha256', secret())
    .update(`reset:${userId}:${iat}`)
    .digest('hex')
}

/** Génère un token HMAC idempotent (rejouable) pour réinitialiser un mot de passe. */
export function generateResetToken(userId: string): { iat: number; token: string } {
  const iat = Math.floor(Date.now() / 1000)
  return { iat, token: sign(userId, iat) }
}

export type VerifyResult = 'ok' | 'invalid' | 'expired'

export function verifyResetToken(userId: string, iat: number, token: string): VerifyResult {
  if (!userId || !iat || !token) return 'invalid'
  const expected = sign(userId, iat)
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
