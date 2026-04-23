import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
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
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // Récupérer le brouillon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newsletter } = await (supabase as any)
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .single()

  if (!newsletter) return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 })
  if (newsletter.status === 'sent') return NextResponse.json({ error: 'Déjà envoyée' }, { status: 400 })
  if (!newsletter.contenu_html) return NextResponse.json({ error: 'Contenu HTML manquant' }, { status: 400 })

  // Utilisateurs opt-in marketing_emails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prefs } = await (supabase as any)
    .from('users_notification_preferences')
    .select('user_id')
    .eq('marketing_emails', true)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, total: 0, message: 'Aucun destinataire opt-in.' })
  }

  const userIds = prefs.map((p: { user_id: string }) => p.user_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase as any)
    .from('users')
    .select('id, email, nom')
    .in('id', userIds)

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, total: 0, message: 'Aucun profil trouvé.' })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let sent = 0
  const errors: string[] = []

  for (const user of users) {
    if (!user.email) continue
    try {
      const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
      const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`

      const html = (newsletter.contenu_html as string)
        .replace(/\{\{nom\}\}/g, nomDisplay)
        .replace(/\{\{lien_desabonnement\}\}/g, lienDesabonnement)
        .replace(/\{\{lien_navigateur\}\}/g, `${siteUrl}/nl/${id}`)

      const sujet = (newsletter.sujet as string)
        .replace(/\{\{nom\}\}/g, nomDisplay)

      await sgMail.send({
        to: user.email,
        from: 'contact@100000medecins.org',
        subject: sujet,
        html,
      })
      sent++
    } catch (e) {
      errors.push(`${user.email}: ${e}`)
    }
  }

  // Marquer comme envoyée
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('newsletters')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    })
    .eq('id', id)

  return NextResponse.json({
    sent,
    total: users.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
