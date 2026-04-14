'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

/**
 * Envoie un email de réinitialisation de mot de passe via SendGrid
 * avec le template éditable en admin.
 */
export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()

  // Générer le lien de récupération via le SDK admin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/reinitialiser-mot-de-passe` },
  })

  if (error) return { error: error.message }

  const resetLink = data.properties?.action_link
  if (!resetLink) return { error: 'Lien de réinitialisation indisponible' }

  // Récupérer le template depuis la DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'reinitialisation_mot_de_passe')
    .single()

  if (!template?.contenu_html) return { error: 'Template email introuvable' }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  const html = (template.contenu_html as string)
    .replace(/\{\{lien_reinitialisation\}\}/g, resetLink)
  const sujet = template.sujet as string

  try {
    await sgMail.send({
      to: email,
      from: 'contact@100000medecins.org',
      subject: sujet,
      html,
    })
  } catch {
    return { error: 'Erreur lors de l\'envoi de l\'email.' }
  }

  return { error: null }
}

/**
 * Récupère le profil complet de l'utilisateur connecté depuis la table users.
 */
export async function getCurrentUserProfile() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('users')
    .select('nom, prenom, specialite, mode_exercice, pseudo, contact_email, rpps, portrait')
    .eq('id', user.id)
    .single()

  return data
}

/**
 * Crée le profil public.users après l'inscription email.
 * Utilise le service role car l'utilisateur n'a pas encore de session active
 * (email non confirmé) et le RLS bloquerait l'insertion.
 */
export async function createUserProfile(userId: string, email: string) {
  const supabase = createServiceRoleClient()

  // Vérifier que l'utilisateur existe bien dans auth.users
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  if (!authUser?.user) throw new Error('Utilisateur introuvable')

  // Vérifier si le profil existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existing) {
    await supabase.from('users').insert({
      id: userId,
      email,
      pseudo: email.split('@')[0] || 'Utilisateur',
      ...(email?.endsWith('@digitalmedicalhub.com') ? { role: 'digital_medical_hub' } : {}),
    })
  }

  return { status: 'SUCCESS' }
}

/**
 * Complète le profil utilisateur après la première inscription.
 * Utilise le service role pour bypasser le RLS.
 */
export async function completeProfile(data: {
  nom: string
  prenom: string
  specialite: string
  mode_exercice: string
  contact_email: string
  pseudo?: string
  portrait?: string
}) {
  const authClient = await createServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('users')
    .update({
      nom: data.nom,
      prenom: data.prenom,
      pseudo: data.pseudo?.trim() || `${data.prenom} ${data.nom.charAt(0)}.`,
      role: 'medecin',
      specialite: data.specialite,
      mode_exercice: data.mode_exercice,
      contact_email: data.contact_email,
      portrait: data.portrait || null,
      is_complete: true,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Mettre à jour l'email auth pour que l'utilisateur puisse se connecter
  // avec son vrai email (et non l'adresse technique PSC psc-ans...@psc.sante.fr)
  if (user.email !== data.contact_email) {
    await supabase.auth.admin.updateUserById(user.id, {
      email: data.contact_email,
      email_confirm: true,
    })
  }

  return { status: 'SUCCESS' }
}

/**
 * Met à jour le profil utilisateur.
 * Remplace : mutation updateUser
 */
export async function updateProfile(userData: {
  nom?: string
  prenom?: string
  pseudo?: string
  annee_naissance?: string
  specialite?: string
  mode_exercice?: string
  densite_population?: string
  niveau_outils_numeriques?: string
  gestion_accueil?: string
  contact_email?: string
  contact_telephone?: string
  contact_adresse?: string
  contact_cp?: string
  contact_ville?: string
  contact_pays?: string
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier l'unicité de l'email si modifié
  if (userData.contact_email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('contact_email', userData.contact_email)
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return { status: 'EMAIL_DOUBLON', message: 'Cet email est déjà utilisé' }
    }
  }

  // Vérifier si le profil est complet
  const requiredFields = ['nom', 'prenom', 'specialite', 'mode_exercice']
  const currentData = { ...userData }
  const isComplete = requiredFields.every(
    (field) => currentData[field as keyof typeof currentData]
  )

  const { error } = await supabase
    .from('users')
    .update({
      ...userData,
      is_complete: isComplete,
    })
    .eq('id', user.id)

  if (error) throw error

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}

/**
 * Met à jour l'avatar de l'utilisateur.
 * Remplace : mutation updateAvatar
 */
export async function updateAvatar(avatarId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Récupérer l'URL de l'avatar
  const { data: avatar, error: avatarError } = await supabase
    .from('avatars')
    .select('url')
    .eq('id', avatarId)
    .single()

  if (avatarError) throw avatarError

  const { error } = await supabase
    .from('users')
    .update({ portrait: avatar.url })
    .eq('id', user.id)

  if (error) throw error

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}

/**
 * Annule un changement d'email en attente de confirmation.
 * Remet l'email actuel confirmé, ce qui efface le token de changement.
 */
export async function cancelEmailChange() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: user.email!,
    email_confirm: true,
  })

  if (error) throw new Error(error.message)
  return { status: 'SUCCESS' }
}

/**
 * Supprime le compte utilisateur.
 * Remplace : mutation deleteUser
 *
 * Note : la suppression cascade via les FK supprime automatiquement
 * les évaluations, favoris, solutions utilisées, préférences.
 */
export async function deleteAccount() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Supprimer le profil utilisateur (cascade)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id)

  if (error) throw error

  // Déconnecter l'utilisateur
  await supabase.auth.signOut()

  return { status: 'SUCCESS' }
}

/**
 * Ajoute une préférence à l'utilisateur.
 * Remplace : mutation setPreferenceUser
 */
export async function setPreference(preferenceId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('users_preferences')
    .insert({
      user_id: user.id,
      preference_id: preferenceId,
    })

  if (error && error.code !== '23505') throw error // 23505 = unique violation

  revalidatePath('/mon-compte/mes-preferences')
  return { status: 'SUCCESS' }
}

/**
 * Retire une préférence de l'utilisateur.
 * Remplace : mutation deletePreferenceUser
 */
export async function removePreference(preferenceId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('users_preferences')
    .delete()
    .eq('user_id', user.id)
    .eq('preference_id', preferenceId)

  if (error) throw error

  revalidatePath('/mon-compte/mes-preferences')
  return { status: 'SUCCESS' }
}
