import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { withEmailLogo } from '@/lib/email/logo'
import { EXCUSE_DEFAULT_SUJET, EXCUSE_DEFAULT_HTML_TEMPLATE } from '@/lib/email/excuseTemplate'
import sgMail from '@sendgrid/mail'

function generateAdminToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateAdminToken()) throw new Error('Non autorisé')
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('evaluations')
    .select('id', { count: 'exact', head: true })
    .gte('last_relance_sent_at', '2026-04-23 00:00:00+00')
    .lt('last_relance_sent_at', '2026-04-24 00:00:00+00')

  return NextResponse.json({ count: count ?? 0 })
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sujetTemplate: string = body.sujet || EXCUSE_DEFAULT_SUJET
  const htmlTemplate: string = body.htmlTemplate || EXCUSE_DEFAULT_HTML_TEMPLATE

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evals } = await (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .gte('last_relance_sent_at', '2026-04-23 00:00:00+00')
    .lt('last_relance_sent_at', '2026-04-24 00:00:00+00')

  if (!evals || evals.length === 0) {
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
    const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl)
    const lienReevaluation = `${siteUrl}/mon-compte/mes-evaluations`
    const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`

    const vars = {
      nom: nomDisplay,
      solution_nom: solution.nom,
      lien_1clic: lien1Clic,
      lien_reevaluation: lienReevaluation,
      lien_desabonnement: lienDesabonnement,
    }

    const sujet = renderTemplate(sujetTemplate, vars)
    const html = withEmailLogo(renderTemplate(htmlTemplate, vars))

    try {
      await sgMail.send({
        to: user.email,
        from: 'contact@100000medecins.org',
        subject: sujet,
        html,
      })
      sent++
    } catch (e) {
      errors.push(`eval ${ev.id} (${user.email}): ${e}`)
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: evals.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
