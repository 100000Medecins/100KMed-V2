import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: configRow } = await (supabase as any)
    .from('site_config')
    .select('valeur')
    .eq('cle', 'crons_routiniers_actifs')
    .maybeSingle()
  if (configRow?.valeur !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'crons disabled by admin' })
  }

  const siteUrl = new URL(req.url).origin
  const now = new Date()
  // On cherche les newsletters dont scheduled_at est dans le passé (ou aujourd'hui) et pas encore envoyées
  const nowIso = now.toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newsletters } = await (supabase as any)
    .from('newsletters')
    .select('*')
    .eq('status', 'draft')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', nowIso)

  if (!newsletters || newsletters.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'Aucune newsletter programmée pour aujourd\'hui' })
  }

  const results = []

  for (const newsletter of newsletters) {
    if (!newsletter.contenu_html) continue

    // Destinataires opt-in
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs } = await (supabase as any)
      .from('users_notification_preferences')
      .select('user_id')
      .eq('marketing_emails', true)

    if (!prefs || prefs.length === 0) {
      results.push({ id: newsletter.id, sent: 0, total: 0 })
      continue
    }

    const userIds = prefs.map((p: { user_id: string }) => p.user_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (supabase as any)
      .from('users')
      .select('id, email, nom')
      .in('id', userIds)

    if (!users || users.length === 0) {
      results.push({ id: newsletter.id, sent: 0, total: 0 })
      continue
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    let sent = 0

    for (const user of users) {
      if (!user.email) continue
      try {
        const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
        const html = (newsletter.contenu_html as string)
          .replace(/\{\{nom\}\}/g, nomDisplay)
          .replace(/\{\{lien_desabonnement\}\}/g, generateUnsubscribeLink(user.id, siteUrl))
          .replace(/\{\{lien_navigateur\}\}/g, `${siteUrl}/nl/${newsletter.id}`)
        const sujet = (newsletter.sujet as string).replace(/\{\{nom\}\}/g, nomDisplay)
        await sgMail.send({
          to: user.email,
          from: 'contact@100000medecins.org',
          subject: sujet,
          html,
        })
        sent++
      } catch (e) {
        console.error(`[envoyer-newsletter-programmee] erreur envoi ${user.email}:`, e)
      }
    }

    // Marquer comme envoyée
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('newsletters')
      .update({ status: 'sent', sent_at: now.toISOString(), recipient_count: sent })
      .eq('id', newsletter.id)

    results.push({ id: newsletter.id, sent, total: users.length })
  }

  return NextResponse.json({ ok: true, results })
}
