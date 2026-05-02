import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

const TEMPLATE_ID = 'relance_incomplet'
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

  const siteUrl = new URL(req.url).origin

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - DELAY_DAYS)

  // Récupérer les évaluations incomplètes abandonnées depuis > 7 jours,
  // pas encore relancées, avec des scores non nuls (l'utilisateur a commencé)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evals, error } = await (supabase as any)
    .from('evaluations')
    .select(`
      id,
      user_id,
      solution_id,
      scores,
      updated_at,
      solution:solutions (
        nom,
        slug,
        categorie:categories!solutions_id_categorie_fkey (
          slug
        )
      ),
      user:users ( email, nom )
    `)
    .is('relance_incomplet_sent_at', null)
    .not('user_id', 'is', null)
    .not('scores', 'is', null)
    .lt('updated_at', cutoff.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sentCount = 0
  const errors: string[] = []

  for (const ev of evals ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categorie = solution?.categorie as any

    if (!user?.email || !solution?.nom || !solution?.slug || !categorie?.slug) continue

    // Vérifier que solutions_utilisees est bien en statut 'instanciee'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: su } = await (supabase as any)
      .from('solutions_utilisees')
      .select('statut_evaluation')
      .eq('user_id', ev.user_id)
      .eq('solution_id', ev.solution_id)
      .single()

    if (!su || su.statut_evaluation !== 'instanciee') continue

    // Vérifier les préférences de notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefs } = await (supabase as any)
      .from('users_notification_preferences')
      .select('relance_emails')
      .eq('user_id', ev.user_id)
      .single()
    if (prefs && prefs.relance_emails === false) continue

    // Construire le lien de reprise direct sur l'évaluation incomplète
    const lienReprise = `${siteUrl}/solution/noter/${categorie.slug}/${solution.slug}`
    const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'

    const result = await buildEmail(TEMPLATE_ID, {
      nom: nomDisplay, prenom: nomDisplay, solution_nom: solution.nom,
      lien_reprise: lienReprise,
      lien_desabonnement: generateUnsubscribeLink(ev.user_id as string, siteUrl),
    }, siteUrl)

    try {
      if (!result) {
        errors.push(`eval ${ev.id}: template "${TEMPLATE_ID}" introuvable`)
        continue
      }
      await sgMail.send({
        to: user.email,
        from: 'contact@100000medecins.org',
        subject: result.sujet,
        html: result.html,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('evaluations')
        .update({ relance_incomplet_sent_at: now.toISOString() })
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
