import { createHmac } from 'crypto'

export function generateUnsubscribeLink(userId: string, siteUrl: string): string {
  const secret = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD!
  const token = createHmac('sha256', secret)
    .update(`unsub:${userId}`)
    .digest('hex')
  return `${siteUrl}/api/se-desabonner?uid=${userId}&token=${token}`
}
