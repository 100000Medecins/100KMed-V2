import { createServerClient } from '@/lib/supabase/server'
import type { Editeur } from '@/types/models'

/**
 * Récupère tous les éditeurs.
 * Remplace : fetchEditeurs
 */
export async function getEditeurs() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .order('nom', { ascending: true })

  if (error) throw error
  return data as Editeur[]
}

/**
 * Récupère un éditeur par son ID, avec ses solutions.
 * Remplace : fetchEditeurById, fetchEditeurByIdSolution
 */
export async function getEditeurById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Editeur
}

/**
 * Récupère un éditeur avec toutes ses solutions.
 */
export async function getEditeurWithSolutions(id: string) {
  const supabase = await createServerClient()

  const [editeurResult, solutionsResult] = await Promise.all([
    supabase.from('editeurs').select('*').eq('id', id).single(),
    supabase
      .from('solutions')
      .select(`*, categorie:categories(*)`)
      .eq('id_editeur', id)
      .order('nom', { ascending: true }),
  ])

  if (editeurResult.error) throw editeurResult.error
  if (solutionsResult.error) throw solutionsResult.error

  return {
    editeur: editeurResult.data as Editeur,
    solutions: solutionsResult.data,
  }
}

/**
 * Génère les paramètres statiques pour ISR.
 */
export async function getAllEditeurIds() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('editeurs')
    .select('id')

  if (error) throw error
  return data.map((e) => e.id)
}
