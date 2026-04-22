import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function generateToken(userId: string, solutionId: string): string {
  const secret = process.env.EMAIL_SECRET || process.env.ADMIN_PASSWORD!
  return createHmac('sha256', secret)
    .update(`${userId}:${solutionId}`)
    .digest('hex')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')
  const sid = searchParams.get('sid')
  const token = searchParams.get('token')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  if (!uid || !sid || !token) {
    return NextResponse.redirect(`${siteUrl}/mon-compte/mes-evaluations?erreur=lien-invalide`)
  }

  // Vérifier le token
  const expected = generateToken(uid, sid)
  if (token !== expected) {
    return NextResponse.redirect(`${siteUrl}/mon-compte/mes-evaluations?erreur=lien-invalide`)
  }

  const supabase = createServiceRoleClient()

  // Revalider l'évaluation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('evaluations')
    .update({
      last_date_note: new Date().toISOString(),
      last_relance_sent_at: null,
      relance_count: 0,
    })
    .eq('user_id', uid)
    .eq('solution_id', sid)

  if (error) {
    return NextResponse.redirect(`${siteUrl}/mon-compte/mes-evaluations?erreur=revalidation-echouee`)
  }

  return NextResponse.redirect(`${siteUrl}/mon-compte/mes-evaluations?revalide=1`)
}
