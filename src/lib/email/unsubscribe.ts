import { generateNotifToken } from './notif-token'

export function generateUnsubscribeLink(userId: string, siteUrl: string): string {
  const { iat, token } = generateNotifToken(userId)
  return `${siteUrl}/gerer-notifications?uid=${userId}&iat=${iat}&token=${token}`
}
