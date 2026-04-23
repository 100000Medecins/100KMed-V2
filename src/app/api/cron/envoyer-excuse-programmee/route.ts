import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { withEmailLogo } from '@/lib/email/logo'
import { buildExcuseEmail } from '@/lib/email/excuseTemplate'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()

  // Lire la programmation depuis site_config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('site_config')
    .select('cle, valeur')
    .in('cle', ['excuse_scheduled_at', 'excuse_scheduled_sujet', 'excuse_scheduled_html'])

  const config: Record<string, string> = {}
  for (const row of rows ?? []) config[row.cle] = row.valeur

  const scheduledAt = config['excuse_scheduled_at']
  const sujetTemplate = config['excuse_scheduled_sujet']
  const htmlTemplate = config['excuse_scheduled_html']

  if (!scheduledAt || !sujetTemplate || !htmlTemplate) {
    return NextResponse.json({ skipped: true, reason: 'Aucun envoi programmé' })
  }

  // Vérifier si l'heure de programmation est passée
  if (new Date(scheduledAt) > new Date()) {
    return NextResponse.json({ skipped: true, reason: 'Pas encore l\'heure', scheduledAt })
  }

  const siteUrl = new URL(req.url).origin

  // Récupérer les évaluations concernées (relance cassée du 23/04)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evals } = await (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .gte('last_relance_sent_at', '2026-04-23 00:00:00+00')
    .lt('last_relance_sent_at', '2026-04-24 00:00:00+00')

  if (!evals || evals.length === 0) {
    // Nettoyer la programmation même si aucun destinataire
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('site_config').delete().in('cle', ['excuse_scheduled_at', 'excuse_scheduled_sujet', 'excuse_scheduled_html'])
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucun destinataire trouvé' })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let sent = 0
  const errors: string[] = []

  for (const ev of evals) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    if (!user?.email || !solution?.nom) continue

    const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
    const vars = {
      nom: nomDisplay,
      solution_nom: solution.nom,
      lien_1clic: generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl),
      lien_reevaluation: `${siteUrl}/mon-compte/mes-evaluations`,
      lien_desabonnement: `${siteUrl}/mon-compte/mes-notifications`,
    }

    try {
      await sgMail.send({
        to: user.email,
        from: 'contact@100000medecins.org',
        subject: renderTemplate(sujetTemplate, vars),
        html: withEmailLogo(buildExcuseEmail(renderTemplate(htmlTemplate, vars))),
      })
      sent++
    } catch (e) {
      errors.push(`eval ${ev.id} (${user.email}): ${e}`)
    }
  }

  // Supprimer la programmation après envoi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('site_config').delete().in('cle', ['excuse_scheduled_at', 'excuse_scheduled_sujet', 'excuse_scheduled_html'])

  return NextResponse.json({
    ok: true,
    sent,
    total: evals.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
