'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Ajoute ou retire une solution des favoris (toggle).
 * Remplace : mutations setSolutionFavorite / deleteSolutionFavorite
 */
export async function toggleFavorite(solutionId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier si déjà en favori
  const { data: existing } = await supabase
    .from('solutions_favorites')
    .select('user_id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Retirer des favoris
    const { error } = await supabase
      .from('solutions_favorites')
      .delete()
      .eq('solution_id', solutionId)
      .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/mon-compte/mes-favoris')
    return { status: 'SUCCESS', action: 'removed' as const }
  } else {
    // Ajouter aux favoris
    const { error } = await supabase
      .from('solutions_favorites')
      .insert({
        user_id: user.id,
        solution_id: solutionId,
      })

    if (error) throw error

    revalidatePath('/mon-compte/mes-favoris')
    return { status: 'SUCCESS', action: 'added' as const }
  }
}
