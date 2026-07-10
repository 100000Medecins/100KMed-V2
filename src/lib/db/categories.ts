import { createServerClient, createServiceRoleClient, createPublicClient } from '@/lib/supabase/server'
import { previewInactive } from '@/lib/preview'
import type { Categorie } from '@/types/models'

export type Groupe = { id: string; nom: string; ordre: number }

/**
 * Récupère toutes les catégories actives, triées par position.
 * Remplace : fetchCategories
 */
export async function getCategories() {
  const supabase = createPublicClient()

  let query = supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true })
  if (!previewInactive()) query = query.eq('actif', true)
  const { data, error } = await query

  if (error) throw error
  return data as Categorie[]
}

/**
 * Récupère toutes les catégories (actives ET inactives) pour l'interface admin.
 */
export async function getAllCategoriesAdmin() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true })

  if (error) throw error
  return data as Categorie[]
}

/**
 * Récupère une catégorie par son ID.
 * Remplace : fetchCategorieByIdCategorie
 */
export async function getCategorieById(id: string) {
  const supabase = createPublicClient()

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
  const supabase = createPublicClient()

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
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as Categorie
}

/**
 * Récupère tous les groupes de catégories, triés par ordre.
 */
export async function getGroupes(): Promise<Groupe[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await (supabase as any)
    .from('groupes_categories')
    .select('id, nom, ordre')
    .order('ordre', { ascending: true })
  if (error) throw error
  return (data ?? []) as Groupe[]
}

/**
 * Récupère les catégories actives avec leur groupe, pour la navbar et la page hub.
 */
export async function getCategoriesAvecGroupe() {
  const supabase = createPublicClient()
  let query = (supabase as any)
    .from('categories')
    .select('nom, slug, groupe_id, groupes_categories(id, nom, ordre)')
    .order('position', { ascending: true })
  if (!previewInactive()) query = query.eq('actif', true)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Array<{
    nom: string
    slug: string | null
    groupe_id: string | null
    groupes_categories: { id: string; nom: string; ordre: number } | null
  }>
}

/**
 * Génère les paramètres statiques pour ISR.
 */
export async function getAllCategorieIds() {
  const supabase = createPublicClient()

  let query = supabase
    .from('categories')
    .select('id')
  if (!previewInactive()) query = query.eq('actif', true)
  const { data, error } = await query

  if (error) throw error
  return data.map((c) => c.id)
}
