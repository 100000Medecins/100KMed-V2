import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { estAdminOuContenu } from '@/lib/auth/admin-guard'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import { adresseEnvoi } from '@/lib/email/destinataire'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

export async function POST(req: NextRequest) {
  if (!(await estAdminOuContenu())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { lien_etude = '', texte_promoteur = '', specialites_cibles = [] } = body

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // Utilisateurs opt-in
  const { data: prefs } = await supabase
    .from('users_notification_preferences')
    .select('user_id')
    .eq('questionnaires_these', true)

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const userIds = prefs.map((p) => p.user_id)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, contact_email, nom, specialite, specialite_secondaire')
    .in('id', userIds)

  // Filtrage par spécialité si des spécialités sont ciblées.
  // Comparaison via specialiteConcerneeAvecSecondaire() : les libellés PSC et ceux
  // de la liste admin diffèrent (un filtre SQL `.in()` raterait les utilisateurs PSC),
  // et on inclut la spécialité secondaire saisie à la main.
  const { specialiteConcerneeAvecSecondaire } = await import('@/lib/constants/profil')
  const users = Array.isArray(specialites_cibles) && specialites_cibles.length > 0
    ? (allUsers ?? []).filter((u) => specialiteConcerneeAvecSecondaire(u.specialite, u.specialite_secondaire, specialites_cibles))
    : (allUsers ?? [])

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let sent = 0
  const errors: string[] = []

  for (const user of users) {
    const to = adresseEnvoi(user)
    if (!to) continue
    try {
      const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
      const result = await buildEmail('questionnaire_recherche', {
        nom: nomDisplay,
        lien_etude,
        texte_promoteur,
        lien_desabonnement: generateUnsubscribeLink(user.id, siteUrl),
      }, siteUrl)

      if (!result) {
        errors.push(`${to}: template "questionnaire_recherche" introuvable`)
        continue
      }

      await sgMail.send({ to, from: EMAIL_SENDER, subject: result.sujet, html: result.html })
      sent++
    } catch (e) {
      errors.push(`${to}: ${e}`)
    }
  }

  return NextResponse.json({ sent, total: users.length, errors: errors.length > 0 ? errors : undefined })
}
