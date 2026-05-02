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

  // Récupérer l'email auth.users pour générer un magic link
  const { data: authUser } = await supabase.auth.admin.getUserById(uid)
  if (!authUser?.user?.email) {
    return NextResponse.redirect(`${siteUrl}/desabonnement-confirme?erreur=lien-invalide`)
  }

  // Générer un magic link → l'utilisateur arrivera connecté sur ses préférences de notification
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
  })

  if (linkError || !linkData) {
    return NextResponse.redirect(`${siteUrl}/desabonnement-confirme?erreur=lien-invalide`)
  }

  const tokenHash = linkData.properties.hashed_token
  const next = encodeURIComponent('/mon-compte/mes-notifications')

  return NextResponse.redirect(
    `${siteUrl}/auth/psc-session?token=${tokenHash}&next=${next}`
  )
}
