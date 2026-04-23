import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

const TEMPLATE_ID = 'relance_psc'
const MAX_RELANCES = 4
const DELAY_DAYS = 7

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - DELAY_DAYS)

  // Récupérer le template email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', TEMPLATE_ID)
    .single()

  if (!template) {
    return NextResponse.json(
      { error: `Template "${TEMPLATE_ID}" introuvable. Créez-le dans Admin → Emails.` },
      { status: 404 }
    )
  }

  // ── 1. Premières relances : jamais relancé, email initial envoyé il y a > 7 jours ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: premieres } = await (supabase as any)
    .from('evaluations')
    .select('id, email_temp, token_verification, solution:solutions(nom), relance_psc_count')
    .eq('statut', 'en_attente_psc')
    .not('email_temp', 'is', null)
    .not('token_verification', 'is', null)
    .is('last_relance_psc_sent_at', null)
    .lt('last_date_note', cutoff.toISOString())

  // ── 2. Relances suivantes : déjà relancé, dernière relance il y a > 7 jours, cap non atteint ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suivantes } = await (supabase as any)
    .from('evaluations')
    .select('id, email_temp, token_verification, solution:solutions(nom), relance_psc_count')
    .eq('statut', 'en_attente_psc')
    .not('email_temp', 'is', null)
    .not('token_verification', 'is', null)
    .not('last_relance_psc_sent_at', 'is', null)
    .lt('last_relance_psc_sent_at', cutoff.toISOString())
    .lt('relance_psc_count', MAX_RELANCES)

  const toProcess = [...(premieres ?? []), ...(suivantes ?? [])]

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sentCount = 0
  const errors: string[] = []

  for (const ev of toProcess) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    if (!ev.email_temp || !ev.token_verification || !solution?.nom) continue

    const relanceNum = (ev.relance_psc_count ?? 0) + 1
    const pscLink = `${siteUrl}/api/auth/psc-initier?token=${ev.token_verification}`

    const sujet = (template.sujet as string)
      .replace(/\{\{solution_nom\}\}/g, solution.nom)
      .replace(/\{\{relance_num\}\}/g, String(relanceNum))

    const html = (template.contenu_html as string)
      .replace(/\{\{solution_nom\}\}/g, solution.nom)
      .replace(/\{\{psc_link\}\}/g, pscLink)
      .replace(/\{\{relance_num\}\}/g, String(relanceNum))
      .replace(/\{\{max_relances\}\}/g, String(MAX_RELANCES))

    try {
      await sgMail.send({
        to: ev.email_temp,
        from: 'contact@100000medecins.org',
        subject: sujet,
        html: html,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('evaluations')
        .update({
          last_relance_psc_sent_at: now.toISOString(),
          relance_psc_count: relanceNum,
        })
        .eq('id', ev.id)

      sentCount++
    } catch (e) {
      errors.push(`eval ${ev.id}: ${e}`)
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
