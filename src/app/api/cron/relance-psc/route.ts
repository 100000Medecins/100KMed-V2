import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'
import { estEmailFictif } from '@/lib/email/destinataire'
import { getSiteConfig } from '@/lib/actions/siteConfig'

export const dynamic = 'force-dynamic'

const TEMPLATE_ID = 'relance_psc'
const MAX_RELANCES = 4
// Première relance : 7 jours après le dépôt de l'évaluation.
const DELAI_PREMIERE_RELANCE_JOURS = 7
// Relances suivantes : un lundi sur deux. 13 jours et non 14 : la tâche ne démarre pas à la
// seconde près d'un lundi à l'autre, un seuil de 14 jours pile repousserait l'envoi au 3e lundi.
const DELAI_ENTRE_RELANCES_JOURS = 13

function ilYA(jours: number, depuis: Date): string {
  const date = new Date(depuis)
  date.setDate(date.getDate() - jours)
  return date.toISOString()
}

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

  // Interrupteur propre à cette relance (Admin → Emails), indépendant de
  // `crons_routiniers_actifs` : relancer les évaluations en attente de validation
  // sans déclencher les autres envois automatiques (revalidation, newsletter…).
  if ((await getSiteConfig('relance_psc_active')) !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'relance PSC désactivée par l\'admin' })
  }

  const supabase = createServiceRoleClient()

  const siteUrl = new URL(req.url).origin

  const now = new Date()

  // ── 1. Premières relances : jamais relancé, email initial envoyé il y a > 7 jours ──
  const { data: premieres } = await supabase
    .from('evaluations')
    .select('id, email_temp, token_verification, solution:solutions(nom), relance_psc_count')
    .eq('statut', 'en_attente_psc')
    .not('email_temp', 'is', null)
    .not('token_verification', 'is', null)
    .is('last_relance_psc_sent_at', null)
    .lt('last_date_note', ilYA(DELAI_PREMIERE_RELANCE_JOURS, now))

  // ── 2. Relances suivantes : déjà relancé, dernière relance il y a 2 semaines, cap non atteint ──
  const { data: suivantes } = await supabase
    .from('evaluations')
    .select('id, email_temp, token_verification, solution:solutions(nom), relance_psc_count')
    .eq('statut', 'en_attente_psc')
    .not('email_temp', 'is', null)
    .not('token_verification', 'is', null)
    .not('last_relance_psc_sent_at', 'is', null)
    .lt('last_relance_psc_sent_at', ilYA(DELAI_ENTRE_RELANCES_JOURS, now))
    .lt('relance_psc_count', MAX_RELANCES)

  const toProcess = [...(premieres ?? []), ...(suivantes ?? [])]

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sentCount = 0
  const errors: string[] = []

  for (const ev of toProcess) {
    const solution = ev.solution
    if (!ev.email_temp || estEmailFictif(ev.email_temp) || !ev.token_verification || !solution?.nom) continue

    const relanceNum = (ev.relance_psc_count ?? 0) + 1
    const pscLink = `${siteUrl}/api/auth/psc-initier?token=${ev.token_verification}`

    const result = await buildEmail(TEMPLATE_ID, {
      solution_nom: solution.nom,
      psc_link: pscLink,
      relance_num: String(relanceNum),
      max_relances: String(MAX_RELANCES),
    }, siteUrl)

    try {
      if (!result) {
        errors.push(`eval ${ev.id}: template "${TEMPLATE_ID}" introuvable`)
        continue
      }
      await sgMail.send({
        to: ev.email_temp,
        from: EMAIL_SENDER,
        subject: result.sujet,
        html: result.html,
      })

      await supabase
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
