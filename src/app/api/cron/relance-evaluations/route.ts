import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

const MAX_RELANCES = 4 // 1 an, 1 an 3 mois, 1 an 6 mois, 1 an 9 mois

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

async function sendRelanceEmail(
  templateId: string,
  toEmail: string,
  prenom: string | null,
  solutionNom: string,
  lienReevaluation: string,
  lien1Clic: string,
  siteUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { data: template } = await supabase
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', templateId)
    .single()

  if (!template) return

  const prenomDisplay = prenom || 'Docteur'
  const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`

  const sujet = (template.sujet as string)
    .replace(/\{\{solution_nom\}\}/g, solutionNom)
    .replace(/\{\{prenom\}\}/g, prenomDisplay)

  const html = (template.contenu_html as string)
    .replace(/\{\{solution_nom\}\}/g, solutionNom)
    .replace(/\{\{prenom\}\}/g, prenomDisplay)
    .replace(/\{\{lien_reevaluation\}\}/g, lienReevaluation)
    .replace(/\{\{lien_1clic\}\}/g, lien1Clic)
    .replace(/\{\{lien_desabonnement\}\}/g, lienDesabonnement)

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  await sgMail.send({
    to: toEmail,
    from: 'contact@100000medecins.org',
    subject: sujet,
    html,
  })
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  const lienReevaluation = `${siteUrl}/mon-compte/mes-evaluations`

  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  let sentCount = 0
  const errors: string[] = []

  // ── 1. Premières relances (1 an, jamais relancé) ─────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evals1an } = await (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, relance_count, solution:solutions(nom), user:users(email, prenom)')
    .not('last_date_note', 'is', null)
    .lt('last_date_note', oneYearAgo.toISOString())
    .is('last_relance_sent_at', null)
    .not('user_id', 'is', null)

  for (const ev of evals1an ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    if (!user?.email || !solution?.nom) continue

    // Vérifier les préférences de notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs } = await (supabase as any)
      .from('users_notification_preferences')
      .select('relance_emails')
      .eq('user_id', ev.user_id)
      .single()
    if (prefs && prefs.relance_emails === false) continue

    try {
      const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string)
      await sendRelanceEmail('relance_1an', user.email, user.prenom, solution.nom, lienReevaluation, lien1Clic, siteUrl, supabase)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('evaluations')
        .update({ last_relance_sent_at: now.toISOString(), relance_count: 1 })
        .eq('id', ev.id)
      sentCount++
    } catch (e) {
      errors.push(`1an eval ${ev.id}: ${e}`)
    }
  }

  // ── 2. Relances suivantes (tous les 3 mois, cap à MAX_RELANCES) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evalsRecurrence } = await (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, relance_count, solution:solutions(nom), user:users(email, prenom)')
    .not('last_relance_sent_at', 'is', null)
    .lt('last_relance_sent_at', threeMonthsAgo.toISOString())
    .lt('relance_count', MAX_RELANCES)
    .not('user_id', 'is', null)

  for (const ev of evalsRecurrence ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    if (!user?.email || !solution?.nom) continue

    // Vérifier les préférences de notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs } = await (supabase as any)
      .from('users_notification_preferences')
      .select('relance_emails')
      .eq('user_id', ev.user_id)
      .single()
    if (prefs && prefs.relance_emails === false) continue

    try {
      const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string)
      await sendRelanceEmail('relance_3mois', user.email, user.prenom, solution.nom, lienReevaluation, lien1Clic, siteUrl, supabase)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('evaluations')
        .update({
          last_relance_sent_at: now.toISOString(),
          relance_count: (ev.relance_count as number) + 1,
        })
        .eq('id', ev.id)
      sentCount++
    } catch (e) {
      errors.push(`recurrence eval ${ev.id}: ${e}`)
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
