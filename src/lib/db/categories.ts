import { createServerClient } from '@/lib/supabase/server'
import type { Categorie } from '@/types/models'

/**
 * Récupère toutes les catégories actives, triées par position.
 * Remplace : fetchCategories
 */
export async function getCategories() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('actif', true)
    .order('position', { ascending: true })

  if (error) throw error
  return data as Categorie[]
}

/**
 * Récupère une catégorie par son ID.
 * Remplace : fetchCategorieByIdCategorie
 */
export async function getCategorieById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Categorie
}

/**
 * Récupère la catégorie par défaut.
 * Remplace : fetchCategorieDefaut
 */
export async function getCategorieDefaut() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('categorie_defaut', true)
    .single()

  if (error) throw error
  return data as Categorie
}

/**
 * Récupère une catégorie par son slug.
 */
export async function getCategorieBySlug(slug: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as Categorie
}

/**
 * Génère les paramètres statiques pour ISR.
 */
export async function getAllCategorieIds() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('actif', true)

  if (error) throw error
  return data.map((c) => c.id)
}
