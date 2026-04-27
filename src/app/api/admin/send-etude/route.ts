import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export async function POST(req: NextRequest) {
  try { await assertAdmin() } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { lien_etude = '', texte_promoteur = '' } = body

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // Utilisateurs opt-in
  const { data: prefs } = await (supabase as any)
    .from('users_notification_preferences')
    .select('user_id')
    .eq('etudes_cliniques', true)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const userIds = prefs.map((p: any) => p.user_id)
  const { data: users } = await (supabase as any)
    .from('users')
    .select('id, email, nom')
    .in('id', userIds)

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let sent = 0
  const errors: string[] = []

  for (const user of users) {
    if (!user.email) continue
    try {
      const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
      const result = await buildEmail('etude_clinique', {
        nom: nomDisplay,
        lien_etude,
        texte_promoteur,
        lien_desabonnement: `${siteUrl}/mon-compte/mes-notifications`,
      }, siteUrl)

      if (!result) {
        errors.push(`${user.email}: template "etude_clinique" introuvable`)
        continue
      }

      await sgMail.send({ to: user.email, from: 'contact@100000medecins.org', subject: result.sujet, html: result.html })
      sent++
    } catch (e) {
      errors.push(`${user.email}: ${e}`)
    }
  }

  return NextResponse.json({ sent, total: users.length, errors: errors.length > 0 ? errors : undefined })
}
