import { createHmac } from 'crypto'

export function generateRevalidationLink(userId: string, solutionId: string, siteUrlOverride?: string): string {
  const secret = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD!
  const token = createHmac('sha256', secret)
    .update(`${userId}:${solutionId}`)
    .digest('hex')
  const siteUrl = siteUrlOverride || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  return `${siteUrl}/api/revalider-avis?uid=${userId}&sid=${solutionId}&token=${token}`
}
