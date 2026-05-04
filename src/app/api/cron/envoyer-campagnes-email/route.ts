import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildEmail } from '@/lib/actions/emailTemplates'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import { getSiteConfig } from '@/lib/actions/siteConfig'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Vérification cron Vercel
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Respect du kill-switch
  const cronsActifs = await getSiteConfig('crons_routiniers_actifs')
  if (cronsActifs !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'crons_routiniers_actifs=false' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Campagnes pending dont le scheduled_at est passé
  const { data: campagnes } = await supabase
    .from('emails_campagnes')
    .select('*')
    .eq('statut', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })

  if (!campagnes || campagnes.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let processed = 0

  for (const campagne of campagnes) {
    const prefKey = campagne.type === 'etude' ? 'etudes_cliniques' : 'questionnaires_these'
    const templateId = campagne.type === 'etude' ? 'etude_clinique' : 'questionnaire_recherche'
    const specialitesCibles: string[] = campagne.specialites_cibles ?? []

    // Opt-ins
    const { data: prefs } = await supabase
      .from('users_notification_preferences')
      .select('user_id')
      .eq(prefKey, true)

    const userIds = (prefs ?? []).map((p: any) => p.user_id)
    let query = supabase
      .from('users')
      .select('id, email, nom, specialite')
      .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

    if (specialitesCibles.length > 0) {
      query = query.in('specialite', specialitesCibles)
    }

    const { data: users } = await query
    const total = (users ?? []).length
    let sent = 0

    for (const user of users ?? []) {
      if (!user.email) continue
      try {
        const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
        const result = await buildEmail(templateId, {
          nom: nomDisplay,
          lien_etude: campagne.lien ?? '',
          texte_promoteur: campagne.texte_promoteur ?? '',
          lien_desabonnement: generateUnsubscribeLink(user.id, siteUrl),
        }, siteUrl)
        if (!result) continue
        await sgMail.send({
          to: user.email,
          from: 'contact@100000medecins.org',
          subject: result.sujet,
          html: result.html,
        })
        sent++
      } catch { /* best-effort */ }
    }

    await supabase
      .from('emails_campagnes')
      .update({
        statut: 'sent',
        envoye_a: sent,
        total,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campagne.id)

    processed++
  }

  return NextResponse.json({ processed })
}
