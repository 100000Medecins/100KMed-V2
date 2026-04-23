import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import sgMail from '@sendgrid/mail'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // Récupérer le template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'lancement')
    .single()

  if (!template?.contenu_html) {
    return NextResponse.json({ error: 'Template "lancement" non configuré ou vide.' }, { status: 400 })
  }

  // Récupérer tous les utilisateurs ayant au moins une évaluation finalisée
  const { data: evals } = await supabase
    .from('evaluations')
    .select('user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .not('last_date_note', 'is', null)
    .not('user_id', 'is', null)
    .not('solution_id', 'is', null)

  if (!evals || evals.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Aucun destinataire trouvé.' })
  }

  // Dédupliquer par user_id (1 email par utilisateur, avec la première solution)
  const seen = new Set<string>()
  const recipients: { email: string; nom: string | null; solutionNom: string; userId: string; solutionId: string }[] = []

  for (const ev of evals) {
    const userId = ev.user_id as string
    if (seen.has(userId)) continue
    seen.add(userId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any
    if (!user?.email) continue
    recipients.push({
      email: user.email,
      nom: user.nom ?? null,
      solutionNom: solution?.nom ?? 'votre logiciel',
      userId,
      solutionId: ev.solution_id as string,
    })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sent = 0
  const errors: string[] = []

  for (const r of recipients) {
    try {
      const lien1Clic = r.userId && r.solutionId
        ? generateRevalidationLink(r.userId, r.solutionId, siteUrl)
        : `${siteUrl}/mon-compte/mes-evaluations`

      const nomDisplay = r.nom ? `Dr. ${r.nom}` : 'Docteur'
      const sujet = (template.sujet as string)
        .replace(/\{\{prenom\}\}/g, nomDisplay)
        .replace(/\{\{nom\}\}/g, nomDisplay)
        .replace(/\{\{solution_nom\}\}/g, r.solutionNom)

      const html = (template.contenu_html as string)
        .replace(/\{\{prenom\}\}/g, nomDisplay)
        .replace(/\{\{nom\}\}/g, nomDisplay)
        .replace(/\{\{solution_nom\}\}/g, r.solutionNom)
        .replace(/\{\{lien_reevaluation\}\}/g, `${siteUrl}/mon-compte/mes-evaluations`)
        .replace(/\{\{lien_1clic\}\}/g, lien1Clic)
        .replace(/\{\{lien_desabonnement\}\}/g, `${siteUrl}/mon-compte/mes-notifications`)

      await sgMail.send({
        to: r.email,
        from: 'contact@100000medecins.org',
        subject: sujet,
        html: html,
      })
      sent++
    } catch (e) {
      errors.push(`${r.email}: ${e}`)
    }
  }

  return NextResponse.json({
    sent,
    total: recipients.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
