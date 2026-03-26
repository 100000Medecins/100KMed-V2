'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Marque une solution comme utilisée par l'utilisateur.
 * Remplace : mutation setSolutionUtilisee / instancieSolutionUtilisee
 */
export async function setSolutionUtilisee(solutionId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier si déjà instanciée
  const { data: existing } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { status: 'SUCCESS', message: 'Solution déjà dans vos outils' }
  }

  const { error } = await supabase.from('solutions_utilisees').insert({
    user_id: user.id,
    solution_id: solutionId,
    statut_evaluation: 'instanciee',
    date_debut: new Date().toISOString().split('T')[0],
  })

  if (error) throw error

  revalidatePath('/mon-compte/mes-evaluations')
  return { status: 'SUCCESS' }
}

/**
 * Marque une solution utilisée comme "ancienne" (plus utilisée).
 * Remplace : mutation setSolutionAncienne
 */
export async function setSolutionAncienne(solutionUtiliseeId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('solutions_utilisees')
    .update({
      statut_evaluation: 'ancienne',
      date_fin: new Date().toISOString().split('T')[0],
    })
    .eq('id', solutionUtiliseeId)
    .eq('user_id', user.id) // Sécurité : seul le propriétaire peut modifier

  if (error) throw error

  revalidatePath('/mon-compte/mes-evaluations')
  return { status: 'SUCCESS' }
}

/**
 * Supprime une solution utilisée et son évaluation associée.
 * Remplace : mutation deleteSolutionUtilisee
 */
export async function deleteSolutionUtilisee(solutionUtiliseeId: string) {
  const authClient = await createServerClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const supabase = createServiceRoleClient()

  // Récupérer la solution_id avant suppression
  const { data: su } = await supabase
    .from('solutions_utilisees')
    .select('solution_id')
    .eq('id', solutionUtiliseeId)
    .eq('user_id', user.id)
    .single()

  if (!su) throw new Error('Évaluation introuvable')

  // Supprimer l'évaluation associée
  await supabase
    .from('evaluations')
    .delete()
    .eq('solution_id', su.solution_id!)
    .eq('user_id', user.id)

  // Supprimer la solution utilisée
  const { error } = await supabase
    .from('solutions_utilisees')
    .delete()
    .eq('id', solutionUtiliseeId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/mon-compte/mes-evaluations')
  return { status: 'SUCCESS' }
}
