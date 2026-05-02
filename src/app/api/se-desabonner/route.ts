import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function verifyToken(userId: string, token: string): boolean {
  const secret = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD!
  const expected = createHmac('sha256', secret)
    .update(`unsub:${userId}`)
    .digest('hex')
  return token === expected
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')
  const siteUrl = new URL(req.url).origin

  if (!uid || !token || !verifyToken(uid, token)) {
    return NextResponse.redirect(`${siteUrl}/desabonnement-confirme?erreur=lien-invalide`)
  }

  const supabase = createServiceRoleClient()

  await supabase
    .from('users_notification_preferences')
    .upsert(
      {
        user_id: uid,
        relance_emails: false,
        marketing_emails: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  return NextResponse.redirect(`${siteUrl}/desabonnement-confirme`)
}
