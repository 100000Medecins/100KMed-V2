import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
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

export async function POST(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const targetEmail: string | null = body.email || null

  const supabase = createServiceRoleClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'

  // Si un email cible est fourni, trouver l'user correspondant d'abord
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .not('user_id', 'is', null)
    .not('last_date_note', 'is', null)

  if (targetEmail) {
    // Trouver l'user par email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetUser } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', targetEmail)
      .maybeSingle()

    if (!targetUser) {
      return NextResponse.json({ error: `Aucun utilisateur trouvé pour l'email : ${targetEmail}` }, { status: 404 })
    }
    query = query.eq('user_id', targetUser.id)
  }

  const { data: ev } = await query.limit(1).single()

  if (!ev) {
    return NextResponse.json({ error: targetEmail ? `Aucune évaluation pour ${targetEmail}` : 'Aucune évaluation trouvée en base' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solution = ev.solution as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = ev.user as any

  if (!solution?.nom) {
    return NextResponse.json({ error: 'Solution introuvable pour cette évaluation' }, { status: 404 })
  }

  // Récupérer le template relance_1an
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'relance_1an')
    .single()

  if (!template) {
    return NextResponse.json({ error: 'Template relance_1an introuvable' }, { status: 404 })
  }

  const nomDisplay = user?.nom ? `Dr. ${user.nom}` : 'Docteur'
  const lienReevaluation = `${siteUrl}/mon-compte/mes-evaluations`
  const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string)
  const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`

  const sujet = `[TEST] ${(template.sujet as string)
    .replace(/\{\{solution_nom\}\}/g, solution.nom)
    .replace(/\{\{prenom\}\}/g, nomDisplay)
    .replace(/\{\{nom\}\}/g, nomDisplay)}`

  const html = (template.contenu_html as string)
    .replace(/\{\{solution_nom\}\}/g, solution.nom)
    .replace(/\{\{prenom\}\}/g, nomDisplay)
    .replace(/\{\{nom\}\}/g, nomDisplay)
    .replace(/\{\{lien_reevaluation\}\}/g, lienReevaluation)
    .replace(/\{\{lien_1clic\}\}/g, lien1Clic)
    .replace(/\{\{lien_desabonnement\}\}/g, lienDesabonnement)

  // L'email de test est toujours envoyé à l'admin, pas au destinataire réel
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: adminEmail,
      from: 'contact@100000medecins.org',
      subject: sujet,
      html,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    sentTo: adminEmail,
    forUser: user?.email ?? ev.user_id,
    solutionNom: solution.nom,
    links: {
      lien1Clic,
      lienReevaluation,
    },
  })
}
