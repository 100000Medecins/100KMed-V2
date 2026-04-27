import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

// Pas de cap : relances tous les 3 mois indéfiniment jusqu'à revalidation

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

async function sendRelanceEmail(
  templateId: string,
  toEmail: string,
  nom: string | null,
  solutionNom: string,
  lienReevaluation: string,
  lien1Clic: string,
  siteUrl: string,
) {
  const nomDisplay = nom ? `Dr. ${nom}` : 'Docteur'
  const result = await buildEmail(templateId, {
    nom: nomDisplay, prenom: nomDisplay, solution_nom: solutionNom,
    lien_reevaluation: lienReevaluation,
    lien_1clic: lien1Clic,
    lien_desabonnement: `${siteUrl}/mon-compte/mes-notifications`,
  }, siteUrl)

  if (!result) return

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  await sgMail.send({
    to: toEmail,
    from: 'contact@100000medecins.org',
    subject: result.sujet,
    html: result.html,
  })
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
    .select('id, user_id, solution_id, relance_count, solution:solutions(nom), user:users(email, nom)')
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
      const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl)
      await sendRelanceEmail('relance_1an', user.email, user.nom, solution.nom, lienReevaluation, lien1Clic, siteUrl)
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
    .select('id, user_id, solution_id, relance_count, solution:solutions(nom), user:users(email, nom)')
    .not('last_relance_sent_at', 'is', null)
    .lt('last_relance_sent_at', threeMonthsAgo.toISOString())
    .gt('relance_count', 0)
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
      const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl)
      await sendRelanceEmail('relance_3mois', user.email, user.nom, solution.nom, lienReevaluation, lien1Clic, siteUrl)
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
