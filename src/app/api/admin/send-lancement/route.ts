import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { estAdminOuContenu } from '@/lib/auth/admin-guard'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import { adresseEnvoi } from '@/lib/email/destinataire'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'
// ~750 destinataires : envoi par lots de ENVOIS_SIMULTANES, bien en deçà de cette limite.
export const maxDuration = 300

const ENVOIS_SIMULTANES = 10
const PAGE = 1000

type Destinataire = { email: string; nom: string | null; solutionNom: string; userId: string; solutionId: string }

export async function POST(req: NextRequest) {
  if (!(await estAdminOuContenu())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // Évaluations finalisées, la plus récente d'abord : c'est elle que le mail cite.
  // Lecture par pages (PostgREST plafonne une réponse à 1 000 lignes).
  const evals = []
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await supabase
      .from('evaluations')
      .select('user_id, solution_id, last_date_note, solution:solutions(nom), user:users(email, contact_email, nom)')
      .not('last_date_note', 'is', null)
      .not('user_id', 'is', null)
      .not('solution_id', 'is', null)
      .order('last_date_note', { ascending: false })
      .order('id', { ascending: true })
      .range(debut, debut + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    evals.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  if (evals.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Aucun destinataire trouvé.' })
  }

  // Médecins qui ont refusé les communications (« Gérer mes notifications »).
  const { data: refus, error: erreurRefus } = await supabase
    .from('users_notification_preferences')
    .select('user_id')
    .eq('marketing_emails', false)
  if (erreurRefus) return NextResponse.json({ error: erreurRefus.message }, { status: 500 })
  const desabonnes = new Set((refus ?? []).map((r) => r.user_id))

  // 1 email par médecin. Adresse : celle qu'il a saisie (`contact_email`), jamais l'adresse
  // fictive fabriquée pour un compte Pro Santé Connect sans email.
  const vus = new Set<string>()
  const destinataires: Destinataire[] = []
  let ignoresDesabonnes = 0
  let ignoresSansAdresse = 0
  for (const ev of evals) {
    const userId = ev.user_id as string
    if (vus.has(userId)) continue
    vus.add(userId)
    if (desabonnes.has(userId)) { ignoresDesabonnes++; continue }
    const email = ev.user ? adresseEnvoi(ev.user) : null
    if (!email) { ignoresSansAdresse++; continue }
    destinataires.push({
      email,
      nom: ev.user?.nom ?? null,
      solutionNom: ev.solution?.nom ?? 'votre logiciel',
      userId,
      solutionId: ev.solution_id as string,
    })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  const envoyer = async (r: Destinataire) => {
    const nomDisplay = r.nom ? `Dr. ${r.nom}` : 'Docteur'
    const result = await buildEmail('lancement', {
      nom: nomDisplay, prenom: nomDisplay, solution_nom: r.solutionNom,
      lien_1clic: generateRevalidationLink(r.userId, r.solutionId, siteUrl),
      lien_reevaluation: `${siteUrl}/mon-compte/mes-evaluations`,
      lien_desabonnement: generateUnsubscribeLink(r.userId, siteUrl),
    }, siteUrl)
    if (!result) throw new Error('template "lancement" introuvable')
    await sgMail.send({ to: r.email, from: EMAIL_SENDER, subject: result.sujet, html: result.html })
  }

  let sent = 0
  const errors: string[] = []
  for (let i = 0; i < destinataires.length; i += ENVOIS_SIMULTANES) {
    const lot = destinataires.slice(i, i + ENVOIS_SIMULTANES)
    const resultats = await Promise.allSettled(lot.map(envoyer))
    resultats.forEach((res, j) => {
      if (res.status === 'fulfilled') sent++
      else errors.push(`${lot[j].email}: ${res.reason}`)
    })
  }

  return NextResponse.json({
    sent,
    total: destinataires.length,
    ignores: { desabonnes: ignoresDesabonnes, sansAdresse: ignoresSansAdresse },
    errors: errors.length > 0 ? errors : undefined,
  })
}
