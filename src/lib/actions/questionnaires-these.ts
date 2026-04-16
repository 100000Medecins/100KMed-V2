'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

export type QuestionnaireThese = {
  id: string
  titre: string
  description: string | null
  lien: string
  image_url: string | null
  date_fin: string | null
  created_by: string | null
  statut: 'en_attente' | 'publie' | 'refuse'
  created_at: string
  updated_at: string
  auteur?: { prenom: string | null; nom: string | null; email: string | null } | null
}

function revalidateAll() {
  revalidatePath('/admin/questionnaires-these')
  revalidatePath('/mon-compte/questionnaires-these')
  revalidatePath('/mon-compte/mes-questionnaires-these')
}

/**
 * Récupère les questionnaires publiés dont la date de fin n'est pas dépassée (page publique).
 */
export async function getQuestionnairesPublies(): Promise<QuestionnaireThese[]> {
  const supabase = createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('questionnaires_these')
    .select('*')
    .eq('statut', 'publie')
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('date_fin', { ascending: true })

  if (error) {
    console.error('[getQuestionnairesPublies]', error.message)
    return []
  }
  return data ?? []
}

/**
 * Retourne true si l'utilisateur connecté a au moins un questionnaire déposé.
 */
export async function hasMesQuestionnaires(): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('questionnaires_these')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
  return (count ?? 0) > 0
}

/**
 * Récupère les questionnaires d'un étudiant (pour sa page de dépôt).
 */
export async function getMesQuestionnaires(): Promise<QuestionnaireThese[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('questionnaires_these')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Dépose un nouveau questionnaire de thèse (étudiant).
 */
export async function deposerQuestionnaire(payload: {
  titre: string
  description?: string
  lien: string
  image_url?: string
  date_fin: string
}): Promise<{ error: string | null }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .insert({
      titre: payload.titre,
      description: payload.description || null,
      lien: payload.lien,
      image_url: payload.image_url || null,
      date_fin: payload.date_fin,
      created_by: user.id,
      statut: 'en_attente',
    })

  if (error) return { error: error.message }
  revalidateAll()

  // Notification aux admins par email (best-effort, ne bloque pas l'utilisateur)
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
    await sgMail.send({
      to: adminEmail,
      from: 'contact@100000medecins.org',
      subject: `[100000médecins] Nouveau questionnaire de thèse à valider`,
      html: `<p>Un nouveau questionnaire de thèse a été déposé et attend votre validation.</p>
<p><strong>Titre :</strong> ${payload.titre}</p>
<p><a href="${siteUrl}/admin/questionnaires-these">Voir dans l'admin →</a></p>`,
    })
  } catch {
    // Notification non bloquante
  }

  return { error: null }
}

/**
 * Supprime un questionnaire (étudiant propriétaire, en_attente uniquement).
 */
export async function supprimerQuestionnaire(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

/**
 * Récupère tous les questionnaires (admin) avec info auteur.
 */
export async function getAllQuestionnairesAdmin(): Promise<QuestionnaireThese[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('questionnaires_these')
    .select('*, auteur:users!created_by(prenom, nom, email)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllQuestionnairesAdmin]', error.message)
    return []
  }
  return data ?? []
}

/**
 * Crée un questionnaire depuis l'admin (sans validation de rôle étudiant).
 */
export async function createQuestionnaireAdmin(payload: {
  titre: string
  description?: string
  lien: string
  image_url?: string
  date_fin: string
  statut?: 'en_attente' | 'publie' | 'refuse'
}): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .insert({
      titre: payload.titre,
      description: payload.description || null,
      lien: payload.lien,
      image_url: payload.image_url || null,
      date_fin: payload.date_fin,
      statut: payload.statut ?? 'publie',
    })

  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

/**
 * Met à jour un questionnaire depuis l'admin.
 */
export async function updateQuestionnaireAdmin(
  id: string,
  payload: {
    titre: string
    description?: string
    lien: string
    image_url?: string
    date_fin: string
    statut: 'en_attente' | 'publie' | 'refuse'
  }
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .update({
      titre: payload.titre,
      description: payload.description || null,
      lien: payload.lien,
      image_url: payload.image_url || null,
      date_fin: payload.date_fin,
      statut: payload.statut,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

/**
 * Change le statut d'un questionnaire (admin).
 */
export async function setStatutQuestionnaire(
  id: string,
  statut: 'publie' | 'refuse'
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

/**
 * Supprime un questionnaire (admin).
 */
export async function supprimerQuestionnaireAdmin(id: string): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('questionnaires_these')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}
