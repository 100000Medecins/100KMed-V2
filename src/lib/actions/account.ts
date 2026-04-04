'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'

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
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    const prenom = profile?.prenom || 'Docteur'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template } = await (supabase as any)
      .from('email_templates')
      .select('sujet, contenu_html')
      .eq('id', 'suppression_compte')
      .single()

    if (template?.contenu_html) {
      const nom = profile?.nom || ''
      const sujet = (template.sujet as string)
        .replace(/\{\{prenom\}\}/g, prenom)
        .replace(/\{\{nom\}\}/g, nom)
      const html = (template.contenu_html as string)
        .replace(/\{\{prenom\}\}/g, prenom)
        .replace(/\{\{nom\}\}/g, nom)
      const recipientEmail = (profile as { contact_email?: string } | null)?.contact_email || user.email!
      await sgMail.send({
        to: recipientEmail,
        from: 'contact@100000medecins.org',
        subject: sujet,
        html,
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

  // 4. Traiter les évaluations
  if (supprimerAvis) {
    // Supprimer les évaluations de l'utilisateur
    await supabase.from('evaluations').delete().eq('user_id', user.id)
  } else {
    // Anonymiser : dissocier du compte mais garder la contribution aux scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('evaluations')
      .update({ user_id: null })
      .eq('user_id', user.id)
  }

  // 5. Supprimer solutions_utilisees et notification prefs
  await supabase.from('solutions_utilisees').delete().eq('user_id', user.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('users_notification_preferences')
    .delete()
    .eq('user_id', user.id)

  // 6. Supprimer le profil public
  await supabase.from('users').delete().eq('id', user.id)

  // 7. Supprimer le compte auth (irréversible)
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) throw new Error(error.message)

  return { status: 'SUCCESS' }
}
