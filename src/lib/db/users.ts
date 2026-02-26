import { createServerClient } from '@/lib/supabase/server'
import type {
  User,
  Preference,
  SolutionUtiliseeWithSolution,
  SolutionFavoriteWithSolution,
} from '@/types/models'

/**
 * Récupère l'utilisateur courant (depuis la session Supabase Auth).
 * Remplace : getUserByToken
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as User | null
}

/**
 * Récupère un utilisateur par son ID (pour les avis publics).
 * Remplace : fetchUserByIdUser
 */
export async function getUserById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('users')
    .select('pseudo, portrait, specialite, mode_exercice')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Récupère les préférences de l'utilisateur.
 * Remplace : fetchPreferencesByIdUser
 */
export async function getUserPreferences(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('users_preferences')
    .select(`
      preference:preferences(*)
    `)
    .eq('user_id', userId)

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => row.preference).filter(Boolean) as Preference[]
}

/**
 * Récupère toutes les préférences disponibles (pour le formulaire).
 */
export async function getAllPreferences() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('is_actif', true)
    .order('ordre', { ascending: true })

  if (error) throw error
  return data as Preference[]
}

/**
 * Récupère les solutions utilisées par l'utilisateur.
 * Remplace : fetchSolutionsUtiliseesByUser
 */
export async function getSolutionsUtilisees(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_utilisees')
    .select(`
      *,
      solution:solutions(
        *,
        editeur:editeurs(*),
        categorie:categories(*)
      )
    `)
    .eq('user_id', userId)
    .neq('statut_evaluation', 'ancienne')

  if (error) throw error
  return data as unknown as SolutionUtiliseeWithSolution[]
}

/**
 * Récupère une solution utilisée spécifique.
 * Remplace : fetchSolutionUtilisee
 */
export async function getSolutionUtilisee(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_utilisees')
    .select(`
      *,
      solution:solutions(*)
    `)
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as unknown as SolutionUtiliseeWithSolution | null
}

/**
 * Récupère les solutions favorites de l'utilisateur.
 * Remplace : fetchSolutionsFavoritesByUser
 */
export async function getSolutionsFavorites(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_favorites')
    .select(`
      *,
      solution:solutions(
        *,
        editeur:editeurs(*),
        categorie:categories(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as SolutionFavoriteWithSolution[]
}

/**
 * Vérifie si une solution est en favori pour l'utilisateur.
 * Remplace : fetchSolutionFavorite
 */
export async function isSolutionFavorite(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_favorites')
    .select('user_id')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

/**
 * Calcule la tranche d'âge de l'utilisateur.
 * Remplace : getTrancheAge
 */
export function getTrancheAge(user: User): string | null {
  if (!user.annee_naissance) return null

  const annee = parseInt(user.annee_naissance, 10)
  if (isNaN(annee)) return null

  const age = new Date().getFullYear() - annee

  if (age < 30) return '< 30 ans'
  if (age < 40) return '30-39 ans'
  if (age < 50) return '40-49 ans'
  if (age < 60) return '50-59 ans'
  return '60+ ans'
}
