'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { recalcResultatsPourSolution } from '@/lib/actions/evaluation'
import { logActivity, ACTIVITY_TYPES, type ActivityDiff } from '@/lib/activity/log'
import { revalidatePath } from 'next/cache'
import { normalizeContacts } from '@/lib/contacts'
import { revalidateSolution } from '@/lib/revalidate-solution'
import type { ContactLigne } from '@/types/models'

/** Construit un diff `{ champ: { avant, apres } }` à partir des lignes d'audit éditeur. */
function diffFromLogRows(
  logRows: Array<{ champ: string; ancienne_valeur: string | null; nouvelle_valeur: string | null }>
): ActivityDiff {
  const diff: ActivityDiff = {}
  for (const r of logRows) diff[r.champ] = { avant: r.ancienne_valeur, apres: r.nouvelle_valeur }
  return diff
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  // Récupérer les solutions affectées avant suppression des évaluations
  const { data: affectedEvals } = await supabase
    .from('evaluations')
    .select('solution_id')
    .eq('user_id', userId)
    .eq('statut', 'publiee')
  const solutionIds = Array.from(new Set((affectedEvals ?? []).map((e) => e.solution_id).filter(Boolean)))

  // Supprimer les données liées (FK sans CASCADE)
  await supabase.from('evaluations').delete().eq('user_id', userId)
  await supabase.from('solutions_utilisees').delete().eq('user_id', userId)
  await supabase.from('solutions_favorites').delete().eq('user_id', userId)
  await s.from('users_notification_preferences').delete().eq('user_id', userId)
  await s.from('users_preferences').delete().eq('user_id', userId)
  await s.from('editeur_claims').delete().eq('user_id', userId)
  await s.from('questionnaires_these').update({ created_by: null }).eq('created_by', userId)

  await supabase.from('users').delete().eq('id', userId)

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  // Flux de supervision admin : suppression de compte par un administrateur
  await logActivity({
    type: ACTIVITY_TYPES.ADMIN_SUPPRESSION,
    acteurType: 'admin',
    acteurLabel: 'Admin',
    cibleType: 'user',
    cibleId: userId,
    cibleLabel: [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || 'Compte supprimé',
  })

  // Recalculer les résultats des solutions dont les évaluations ont été supprimées
  for (const solutionId of solutionIds) {
    await recalcResultatsPourSolution(solutionId as string)
  }
  // Invalider le cache ISR des pages solutions même si aucune évaluation n'était publiée
  revalidatePath('/solutions', 'layout')
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

  // users.editeur_id est la source de vérité (N users peuvent partager le même éditeur)
  await supabase.from('users').update({
    role,
    editeur_id: role === 'editeur' ? editeurId : null,
  }).eq('id', userId)
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

  // Vérifier le rôle ET récupérer l'editeur_id en une requête
  const { data: userRow } = await supabase
    .from('users')
    .select('role, editeur_id')
    .eq('id', userId)
    .single()

  if (userRow?.role !== 'editeur' || !userRow.editeur_id) return null

  // Récupérer l'éditeur via users.editeur_id (tous les champs éditables côté éditeur)
  const { data: editeur } = await supabase
    .from('editeurs')
    .select('id, nom, nom_commercial, logo_url, logo_titre, website, mot_editeur, contact_ville, contact_pays, nb_employes')
    .eq('id', userRow.editeur_id)
    .single()

  if (!editeur) return null

  // Maison-mère (Option A) : un compte rattaché à un éditeur parent gère aussi les
  // solutions de ses filiales (éditeurs dont parent_id pointe vers lui).
  const { data: filiales } = await supabase
    .from('editeurs')
    .select('id, nom, nom_commercial, logo_url, logo_titre, website, mot_editeur, contact_ville, contact_pays, nb_employes')
    .eq('parent_id', editeur.id)
    .order('nom', { ascending: true })

  const editeurIds = [editeur.id, ...(filiales ?? []).map((f) => f.id)]

  // Récupérer les solutions du parent + des filiales (avec prix, galerie, mot éditeur par solution, contacts par solution)
  const { data: solutions } = await supabase
    .from('solutions')
    .select('id, nom, slug, id_categorie, logo_url, actif, id_editeur, mot_editeur, prix_ttc, prix_ttc_min, prix_ttc_max, prix_devise, prix_frequence, prix_duree_engagement_mois, contact_email, contact_telephone, support_email, support_telephone, support_website, contacts_commerciaux, contacts_support, galerie:solutions_galerie(id, url, titre, ordre, type)')
    .in('id_editeur', editeurIds)
    .order('nom', { ascending: true })

  return { editeur, solutions: solutions ?? [], filiales: filiales ?? [] }
}

/**
 * Vérifie que l'utilisateur est un éditeur validé et que la solution lui appartient.
 * Retourne l'editeur_id ou throw.
 */
async function assertEditeurAccessToSolution(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  solutionId: string
): Promise<string> {
  // users.editeur_id = source de vérité (N users par éditeur possible)
  const { data: userRow } = await supabase
    .from('users')
    .select('role, editeur_id')
    .eq('id', userId)
    .single()

  if (userRow?.role !== 'editeur' || !userRow.editeur_id) {
    throw new Error('Non autorisé')
  }

  // Maison-mère (Option A) : autoriser aussi les solutions des filiales du parent
  const { data: filiales } = await supabase
    .from('editeurs')
    .select('id')
    .eq('parent_id', userRow.editeur_id)
  const editeurIds = [userRow.editeur_id, ...(filiales ?? []).map((f) => f.id)]

  const { data: solution } = await supabase
    .from('solutions')
    .select('id')
    .eq('id', solutionId)
    .in('id_editeur', editeurIds)
    .single()

  if (!solution) throw new Error('Solution non autorisée')

  return userRow.editeur_id
}

/**
 * Met à jour les champs autorisés de l'éditeur (table `editeurs`).
 * Logge chaque champ modifié dans editeurs_edit_log pour audit.
 */
export async function updateEditeurByUser(
  userId: string,
  editeurId: string,
  fields: {
    nom_commercial?: string
    logo_url?: string
    logo_titre?: string
    mot_editeur?: string
    website?: string
    contact_ville?: string
    contact_pays?: string
    nb_employes?: number | null
  }
) {
  const supabase = createServiceRoleClient()

  const { data: userRow } = await supabase
    .from('users')
    .select('role, editeur_id, prenom, nom')
    .eq('id', userId)
    .single()

  if (userRow?.role !== 'editeur' || !userRow.editeur_id) {
    throw new Error('Non autorisé')
  }

  // Maison-mère (Option A) : l'utilisateur peut éditer son éditeur ET ses filiales.
  // On vérifie que editeurId est soit son propre éditeur, soit une filiale (parent_id = son éditeur).
  const editeurIdsAutorises = new Set<string>([userRow.editeur_id])
  const { data: filiales } = await supabase
    .from('editeurs')
    .select('id')
    .eq('parent_id', userRow.editeur_id)
  for (const f of filiales ?? []) editeurIdsAutorises.add(f.id)
  if (!editeurIdsAutorises.has(editeurId)) {
    throw new Error('Éditeur non autorisé')
  }

  // Filtrer les champs définis (undefined = pas touché)
  const requested = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (requested.length === 0) return

  // Lire les valeurs actuelles pour calculer le diff (audit log)
  const fieldsList = requested.map(([k]) => k).join(', ')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from('editeurs')
    .select(fieldsList)
    .eq('id', editeurId)
    .single()

  const updates: Record<string, string | null> = {}
  const logRows: Array<{ user_id: string; table_cible: string; id_cible: string; champ: string; ancienne_valeur: string | null; nouvelle_valeur: string | null }> = []
  for (const [key, value] of requested) {
    const newVal = value ? String(value) : null
    const oldVal = current?.[key] != null ? String(current[key]) : null
    if (newVal !== oldVal) {
      updates[key] = newVal
      logRows.push({
        user_id: userId,
        table_cible: 'editeurs',
        id_cible: editeurId,
        champ: key,
        ancienne_valeur: oldVal,
        nouvelle_valeur: newVal,
      })
    }
  }

  if (Object.keys(updates).length === 0) return

  await supabase.from('editeurs').update(updates).eq('id', editeurId)
  if (logRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('editeurs_edit_log').insert(logRows)

    // Événement résumé dans le flux de supervision (détail champ par champ : editeurs_edit_log)
    const { data: ed } = await supabase
      .from('editeurs')
      .select('nom_commercial')
      .eq('id', editeurId)
      .single()
    await logActivity({
      type: ACTIVITY_TYPES.EDITEUR_MODIF_FICHE,
      acteurType: 'editeur',
      acteurId: userId,
      acteurLabel: [userRow.prenom, userRow.nom].filter(Boolean).join(' ') || null,
      cibleType: 'editeur',
      cibleId: editeurId,
      cibleLabel: ed?.nom_commercial ?? null,
      diff: diffFromLogRows(logRows),
    })
  }
}

/**
 * Met à jour les champs autorisés d'une solution (table `solutions`).
 * Logge chaque champ modifié dans editeurs_edit_log pour audit.
 */
export async function updateSolutionByEditeur(
  userId: string,
  solutionId: string,
  fields: {
    logo_url?: string
    mot_editeur?: string
    prix_ttc?: number | null
    prix_ttc_min?: number | null
    prix_ttc_max?: number | null
    prix_devise?: string
    prix_frequence?: string
    prix_duree_engagement_mois?: number | null
    support_website?: string
    contacts_commerciaux?: ContactLigne[]
    contacts_support?: ContactLigne[]
  }
) {
  const supabase = createServiceRoleClient()
  await assertEditeurAccessToSolution(supabase, userId, solutionId)

  const requested = Object.entries(fields).filter(([, v]) => v !== undefined)
  if (requested.length === 0) return

  // Lire valeurs actuelles pour audit
  const fieldsList = requested.map(([k]) => k).join(', ')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from('solutions')
    .select(fieldsList)
    .eq('id', solutionId)
    .single()

  const updates: Record<string, string | number | null | ContactLigne[]> = {}
  const logRows: Array<{ user_id: string; table_cible: string; id_cible: string; champ: string; ancienne_valeur: string | null; nouvelle_valeur: string | null }> = []
  for (const [key, value] of requested) {
    // Champs JSONB (listes de contacts) : comparaison/log via JSON.stringify.
    if (key === 'contacts_commerciaux' || key === 'contacts_support') {
      const newArr = normalizeContacts(value)
      const newStr = JSON.stringify(newArr)
      const oldStr = JSON.stringify(normalizeContacts(current?.[key]))
      if (newStr !== oldStr) {
        updates[key] = newArr
        logRows.push({
          user_id: userId,
          table_cible: 'solutions',
          id_cible: solutionId,
          champ: key,
          ancienne_valeur: oldStr,
          nouvelle_valeur: newStr,
        })
      }
      continue
    }
    const newVal = value === '' || value == null ? null : value
    const oldVal = current?.[key] != null ? current[key] : null
    if (String(newVal) !== String(oldVal)) {
      updates[key] = newVal
      logRows.push({
        user_id: userId,
        table_cible: 'solutions',
        id_cible: solutionId,
        champ: key,
        ancienne_valeur: oldVal != null ? String(oldVal) : null,
        nouvelle_valeur: newVal != null ? String(newVal) : null,
      })
    }
  }

  if (Object.keys(updates).length === 0) return

  await supabase.from('solutions').update(updates).eq('id', solutionId)
  if (logRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('editeurs_edit_log').insert(logRows)

    // Événement résumé dans le flux de supervision (détail champ par champ : editeurs_edit_log)
    const [{ data: u }, { data: sol }] = await Promise.all([
      supabase.from('users').select('prenom, nom').eq('id', userId).single(),
      supabase.from('solutions').select('nom, slug, id_categorie').eq('id', solutionId).single(),
    ])
    await logActivity({
      type: ACTIVITY_TYPES.EDITEUR_MODIF_SOLUTION,
      acteurType: 'editeur',
      acteurId: userId,
      acteurLabel: [u?.prenom, u?.nom].filter(Boolean).join(' ') || null,
      cibleType: 'solution',
      cibleId: solutionId,
      cibleLabel: sol?.nom ?? null,
      diff: diffFromLogRows(logRows),
    })

    // Revalide la fiche solution (+ listings) : sans ça, une modif éditeur
    // (contacts, mot éditeur, prix…) peut mettre jusqu'à 1h à s'afficher (ISR).
    await revalidateSolution(sol?.slug, sol?.id_categorie)
  }
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
  await assertEditeurAccessToSolution(supabase, userId, solutionId)

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
