import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import { buildEmail } from '@/lib/actions/emailTemplates'
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
  // Pour le test, on utilise l'origine de la requête (dev ou www selon le déploiement)
  // afin que le lien 1-clic soit cliquable sur ce même serveur.
  const siteUrl = new URL(req.url).origin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'

  // Si un email cible est fourni, trouver l'user correspondant d'abord
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .not('user_id', 'is', null)
    .not('last_date_note', 'is', null)

  if (targetEmail) {
    // Chercher d'abord dans public.users (email renseigné)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userId: string | null = null
    const { data: publicUser } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('email', targetEmail)
      .maybeSingle()

    if (publicUser) {
      userId = publicUser.id
    } else {
      // Fallback 1 : contact_email (utilisateurs PSC dont l'email de contact diffère de l'email auth)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contactUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('contact_email', targetEmail)
        .maybeSingle()

      if (contactUser) {
        userId = contactUser.id
      } else {
        // Fallback 2 : chercher dans auth.users via l'API admin Supabase
        const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const authUser = authList?.users?.find((u) => u.email === targetEmail)
        if (!authUser) {
          return NextResponse.json({ error: `Aucun utilisateur trouvé pour l'email : ${targetEmail}` }, { status: 404 })
        }
        userId = authUser.id
      }
    }

    query = query.eq('user_id', userId)
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

  const nomDisplay = user?.nom ? `Dr. ${user.nom}` : 'Docteur'
  const lienReevaluation = `${siteUrl}/mon-compte/mes-evaluations`
  const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl)

  const result = await buildEmail('relance_1an', {
    nom: nomDisplay, prenom: nomDisplay, solution_nom: solution.nom,
    lien_reevaluation: lienReevaluation,
    lien_1clic: lien1Clic,
    lien_desabonnement: generateUnsubscribeLink(ev.user_id as string, siteUrl),
  }, siteUrl)

  if (!result) {
    return NextResponse.json({ error: 'Template relance_1an introuvable' }, { status: 404 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: adminEmail,
      from: 'contact@100000medecins.org',
      subject: `[TEST] ${result.sujet}`,
      html: result.html,
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
