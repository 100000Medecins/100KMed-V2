'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Met à jour un champ texte d'un utilisateur (nom, prenom, email).
 */
export async function updateUserField(
  userId: string,
  field: 'nom' | 'prenom' | 'email' | 'pseudo' | 'contact_email',
  value: string
) {
  const supabase = createServiceRoleClient()
  await supabase.from('users').update({ [field]: value || null }).eq('id', userId)
}

/**
 * Supprime définitivement un compte utilisateur (public.users + auth.users).
 * Trace la suppression dans compte_suppressions pour les métriques admin.
 */
export async function deleteUser(userId: string) {
  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from('users')
    .select('nom, prenom, specialite')
    .eq('id', userId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('compte_suppressions').insert({
    prenom: profile?.prenom ?? null,
    nom: profile?.nom ?? null,
    specialite: profile?.specialite ?? null,
    raison: 'Suppression par un administrateur',
    avec_suppression_avis: true,
  })

  await supabase.from('evaluations').delete().eq('user_id', userId)
  await supabase.from('solutions_utilisees').delete().eq('user_id', userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('users_notification_preferences').delete().eq('user_id', userId)
  await supabase.from('users').delete().eq('id', userId)

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

/**
 * Assigne un rôle et un éditeur associé à un utilisateur.
 * Si role !== 'editeur', l'éditeur associé est détaché.
 */
export async function assignEditeurToUser(
  userId: string,
  role: string,
  editeurId: string | null
) {
  const supabase = createServiceRoleClient()

  // Mettre à jour le rôle de l'utilisateur
  await supabase.from('users').update({ role }).eq('id', userId)

  // Détacher l'ancien éditeur éventuellement lié à cet utilisateur
  await supabase.from('editeurs').update({ user_id: null }).eq('user_id', userId)

  // Si rôle éditeur et un éditeur est sélectionné → associer
  if (role === 'editeur' && editeurId) {
    await supabase.from('editeurs').update({ user_id: userId }).eq('id', editeurId)
  }
}

/**
 * Récupère la liste des utilisateurs ayant opté pour les études cliniques.
 * Accessible uniquement aux utilisateurs avec le rôle 'digital_medical_hub'.
 */
export async function getHdhOptins(requestingUserId: string) {
  const supabase = createServiceRoleClient()

  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', requestingUserId)
    .single()

  if (requester?.role !== 'digital_medical_hub') throw new Error('Non autorisé')

  // etudes_cliniques est dans users_notification_preferences, pas dans users
  const { data: prefs } = await supabase
    .from('users_notification_preferences')
    .select('user_id')
    .eq('etudes_cliniques', true)

  const userIds = (prefs ?? []).map((p) => p.user_id)
  if (userIds.length === 0) return []

  const { data } = await supabase
    .from('users')
    .select('id, email, contact_email, nom, prenom, specialite, created_at')
    .in('id', userIds)
    .order('created_at', { ascending: false })

  return data ?? []
}

/**
 * Récupère l'éditeur et ses solutions pour l'utilisateur connecté.
 * Retourne null si l'utilisateur n'est pas éditeur ou n'a pas d'éditeur associé.
 */
export async function getEditeurDataForUser(userId: string) {
  const supabase = createServiceRoleClient()

  // Vérifier le rôle
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (userRow?.role !== 'editeur') return null

  // Récupérer l'éditeur associé
  const { data: editeur } = await supabase
    .from('editeurs')
    .select('id, nom, nom_commercial, logo_url, website, mot_editeur')
    .eq('user_id', userId)
    .single()

  if (!editeur) return null

  // Récupérer les solutions de cet éditeur
  const { data: solutions } = await supabase
    .from('solutions')
    .select('id, nom, slug, logo_url, actif, galerie:solutions_galerie(id, url, titre, ordre, type)')
    .eq('id_editeur', editeur.id)
    .order('nom', { ascending: true })

  return { editeur, solutions: solutions ?? [] }
}

/**
 * Met à jour les champs éditeur autorisés pour une solution.
 * Vérifie que la solution appartient bien à l'éditeur de l'utilisateur.
 */
export async function updateSolutionByEditeur(
  userId: string,
  solutionId: string,
  fields: {
    mot_editeur?: string
    logo_url?: string
    website?: string
  }
) {
  const supabase = createServiceRoleClient()

  // Vérifier que l'utilisateur est bien éditeur et récupérer son éditeur
  const { data: editeur } = await supabase
    .from('editeurs')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!editeur) throw new Error('Non autorisé')

  // Vérifier que la solution appartient à cet éditeur
  const { data: solution } = await supabase
    .from('solutions')
    .select('id')
    .eq('id', solutionId)
    .eq('id_editeur', editeur.id)
    .single()

  if (!solution) throw new Error('Solution non autorisée')

  // Mettre à jour les champs éditeur sur la solution ET sur l'éditeur selon le champ
  const solutionFields: Record<string, string> = {}
  const editeurFields: Record<string, string> = {}

  if (fields.logo_url !== undefined) {
    solutionFields.logo_url = fields.logo_url
    editeurFields.logo_url = fields.logo_url
  }
  if (fields.website !== undefined) {
    editeurFields.website = fields.website
  }
  if (fields.mot_editeur !== undefined) {
    editeurFields.mot_editeur = fields.mot_editeur
  }

  const updates: PromiseLike<unknown>[] = []
  if (Object.keys(solutionFields).length > 0) {
    updates.push(supabase.from('solutions').update(solutionFields).eq('id', solutionId))
  }
  if (Object.keys(editeurFields).length > 0) {
    updates.push(supabase.from('editeurs').update(editeurFields).eq('id', editeur.id))
  }

  await Promise.all(updates)
}

/**
 * Synchronise la galerie d'une solution pour un éditeur.
 * Vérifie l'appartenance avant toute écriture.
 */
export async function syncGalerieByEditeur(
  userId: string,
  solutionId: string,
  galerieItems: Array<{ url: string; titre: string | null; ordre: number | null; type?: string | null }>
) {
  const supabase = createServiceRoleClient()

  // Vérification sécurité
  const { data: editeur } = await supabase
    .from('editeurs')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!editeur) throw new Error('Non autorisé')

  const { data: solution } = await supabase
    .from('solutions')
    .select('id')
    .eq('id', solutionId)
    .eq('id_editeur', editeur.id)
    .single()

  if (!solution) throw new Error('Solution non autorisée')

  // Supprimer et réinsérer
  await supabase.from('solutions_galerie').delete().eq('id_solution', solutionId)

  const rows = galerieItems
    .filter((img) => img.url.trim() !== '')
    .map((img) => ({
      id_solution: solutionId,
      url: img.url,
      titre: img.titre || null,
      ordre: img.ordre ?? 0,
      type: img.type || null,
    }))

  if (rows.length > 0) {
    await supabase.from('solutions_galerie').insert(rows)
  }
}
