import { createHmac } from 'crypto'

function getSecret(): string {
  return process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret'
}

/**
 * Génère un token HMAC signé pour initier une fusion de comptes.
 * Format interne : "sourceId|targetId|timestamp" signé avec HMAC-SHA256.
 * Encodé en base64url pour passer en URL.
 */
export function generateFusionToken(sourceId: string, targetId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${sourceId}|${targetId}|${timestamp}`
  const hmac = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}|${hmac}`).toString('base64url')
}

/**
 * Vérifie et décode un token de fusion.
 * Retourne null si le token est invalide, malformé ou expiré (15 minutes).
 */
export function verifyFusionToken(token: string): { sourceId: string; targetId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const lastPipe = decoded.lastIndexOf('|')
    if (lastPipe === -1) return null
    const receivedHmac = decoded.slice(lastPipe + 1)
    const payload = decoded.slice(0, lastPipe)

    const expectedHmac = createHmac('sha256', getSecret()).update(payload).digest('hex')
    if (receivedHmac !== expectedHmac) return null

    const parts = payload.split('|')
    if (parts.length !== 3) return null
    const [sourceId, targetId, timestamp] = parts

    // Expiration 15 minutes
    if (Date.now() - parseInt(timestamp) > 15 * 60 * 1000) return null

    return { sourceId, targetId }
  } catch {
    return null
  }
}
