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
  try { await assertAdmin() } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { lien_etude = '', texte_promoteur = '' } = body

  const supabase = createServiceRoleClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Template
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'questionnaire_recherche')
    .single()

  if (!template?.contenu_html) {
    return NextResponse.json({ error: 'Template "questionnaire_recherche" non configuré ou vide.' }, { status: 400 })
  }

  // Utilisateurs opt-in
  const { data: prefs } = await (supabase as any)
    .from('users_notification_preferences')
    .select('user_id')
    .eq('questionnaires_these', true)

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
      const sujet = (template.sujet as string)
        .replace(/\{\{nom\}\}/g, nomDisplay)

      const html = (template.contenu_html as string)
        .replace(/\{\{nom\}\}/g, nomDisplay)
        .replace(/\{\{lien_etude\}\}/g, lien_etude)
        .replace(/\{\{texte_promoteur\}\}/g, texte_promoteur)
        .replace(/\{\{lien_desabonnement\}\}/g, `${siteUrl}/mon-compte/mes-notifications`)

      await sgMail.send({ to: user.email, from: 'contact@100000medecins.org', subject: sujet, html: html })
      sent++
    } catch (e) {
      errors.push(`${user.email}: ${e}`)
    }
  }

  return NextResponse.json({ sent, total: users.length, errors: errors.length > 0 ? errors : undefined })
}
