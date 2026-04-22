import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
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

  const supabase = createServiceRoleClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Récupérer le template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'infos_mensuels')
    .single()

  if (!template?.contenu_html) {
    return NextResponse.json({ error: 'Template "infos_mensuels" non configuré ou vide.' }, { status: 400 })
  }

  // Récupérer les user_id opt-in marketing_emails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prefs } = await (supabase as any)
    .from('users_notification_preferences')
    .select('user_id')
    .eq('marketing_emails', true)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, total: 0, message: 'Aucun destinataire opt-in trouvé.' })
  }

  const userIds = prefs.map((p: { user_id: string }) => p.user_id)

  // Récupérer les profils correspondants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase as any)
    .from('users')
    .select('id, email, nom')
    .in('id', userIds)

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, total: 0, message: 'Aucun profil utilisateur trouvé.' })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sent = 0
  const errors: string[] = []

  for (const user of users) {
    if (!user.email) continue
    try {
      const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`
      const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'

      const sujet = (template.sujet as string)
        .replace(/\{\{prenom\}\}/g, nomDisplay)
        .replace(/\{\{nom\}\}/g, nomDisplay)

      const html = (template.contenu_html as string)
        .replace(/\{\{prenom\}\}/g, nomDisplay)
        .replace(/\{\{nom\}\}/g, nomDisplay)
        .replace(/\{\{lien_desabonnement\}\}/g, lienDesabonnement)

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

  return NextResponse.json({
    sent,
    total: users.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
