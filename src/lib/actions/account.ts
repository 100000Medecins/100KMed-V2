'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import sgMail from '@sendgrid/mail'
import { buildEmail } from '@/lib/actions/emailTemplates'
import { recalcResultatsPourSolution } from '@/lib/actions/evaluation'

interface DeleteAccountOptions {
  supprimerAvis: boolean
  raison?: string
}

export async function deleteAccount({ supprimerAvis, raison }: DeleteAccountOptions) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const supabase = createServiceRoleClient()

  // 1. Récupérer les infos du profil pour le mail
  const { data: profile } = await supabase
    .from('users')
    .select('nom, prenom, specialite, mode_exercice, contact_email')
    .eq('id', user.id)
    .single()

  // 2. Sauvegarder dans compte_suppressions (pour les métriques admin)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('compte_suppressions')
    .insert({
      prenom: profile?.prenom ?? null,
      nom: profile?.nom ?? null,
      specialite: profile?.specialite ?? null,
      raison: raison?.trim() || null,
      avec_suppression_avis: supprimerAvis,
    })

  // 3. Envoyer le mail d'au revoir à l'utilisateur (template depuis la DB)
  const headersList = await headers()
  const host = headersList.get('host') || 'www.100000medecins.org'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = `${proto}://${host}`

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
const nomDisplay = profile?.nom ? `Dr. ${profile.nom}` : 'Docteur'
    const recipientEmail = (profile as { contact_email?: string } | null)?.contact_email || user.email!
    const result = await buildEmail('suppression_compte', { nom: nomDisplay, prenom: nomDisplay }, siteUrl)
    if (result) {
      await sgMail.send({
        to: recipientEmail,
        from: 'contact@100000medecins.org',
        subject: result.sujet,
        html: result.html,
      })
    }
  } catch {
    // Ne pas bloquer la suppression si l'email échoue
  }

  // 4. Envoyer le mail de notification à l'équipe
  try {
    await sgMail.send({
      to: 'contact@100000medecins.org',
      from: 'contact@100000medecins.org',
      subject: `Suppression de compte — ${profile?.prenom ?? ''} ${profile?.nom ?? ''} (${user.email})`,
      html: `
        <h2>Demande de suppression de compte</h2>
        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <tr><td style="color:#6b7280;padding-right:16px;">Prénom</td><td><strong>${profile?.prenom ?? '—'}</strong></td></tr>
          <tr><td style="color:#6b7280;">Nom</td><td><strong>${profile?.nom ?? '—'}</strong></td></tr>
          <tr><td style="color:#6b7280;">Email</td><td><strong>${user.email}</strong></td></tr>
          <tr><td style="color:#6b7280;">Spécialité</td><td><strong>${profile?.specialite ?? '—'}</strong></td></tr>
          <tr><td style="color:#6b7280;">Mode d'exercice</td><td><strong>${profile?.mode_exercice ?? '—'}</strong></td></tr>
          <tr><td style="color:#6b7280;">Avis supprimés</td><td><strong>${supprimerAvis ? 'Oui' : 'Non (anonymisés)'}</strong></td></tr>
          <tr><td style="color:#6b7280;vertical-align:top;">Raison</td><td><strong>${raison?.trim() || '—'}</strong></td></tr>
        </table>
      `,
    })
  } catch {
    // Ne pas bloquer la suppression si l'email échoue
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  // 4. Traiter les évaluations
  let solutionIdsToRecalc: string[] = []
  if (supprimerAvis) {
    // Récupérer les solutions affectées avant suppression
    const { data: affectedEvals } = await supabase
      .from('evaluations')
      .select('solution_id')
      .eq('user_id', user.id)
      .eq('statut', 'publiee')
    solutionIdsToRecalc = [...new Set((affectedEvals ?? []).map((e) => e.solution_id).filter(Boolean) as string[])]

    await supabase.from('evaluations').delete().eq('user_id', user.id)
  } else {
    // Anonymiser : dissocier du compte mais garder la contribution aux scores
    await s.from('evaluations').update({ user_id: null }).eq('user_id', user.id)
  }

  // 5. Supprimer les données liées (FK sans CASCADE)
  await supabase.from('solutions_utilisees').delete().eq('user_id', user.id)
  await supabase.from('solutions_favorites').delete().eq('user_id', user.id)
  await s.from('users_notification_preferences').delete().eq('user_id', user.id)
  await s.from('users_preferences').delete().eq('user_id', user.id)
  await s.from('editeur_claims').delete().eq('user_id', user.id)
  await s.from('questionnaires_these').update({ created_by: null }).eq('created_by', user.id)

  // 6. Supprimer le profil public
  await supabase.from('users').delete().eq('id', user.id)

  // 7. Supprimer le compte auth (irréversible)
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) throw new Error(error.message)

  // Sign out côté serveur avant de retourner — évite le crash Server Components
  // qui survient quand Next.js tente de re-render avec une session désormais invalide
  await authClient.auth.signOut()

  // Recalculer les résultats des solutions dont les évaluations ont été supprimées
  for (const solutionId of solutionIdsToRecalc) {
    await recalcResultatsPourSolution(solutionId)
  }

  return { status: 'SUCCESS' }
}
