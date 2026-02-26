import { createServerClient } from '@/lib/supabase/server'
import type { Critere, CritereWithChildren } from '@/types/models'

/**
 * Récupère les critères par catégorie et types.
 * Remplace : fetchCriteresByType
 */
export async function getCriteresByType(categorieId: string, types: string[]) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criteres')
    .select('*, categorie:categories!inner(id)')
    .eq('categorie.id', categorieId)
    .in('type', types)

  if (error) throw error
  return data as unknown as Critere[]
}

/**
 * Récupère un critère par son ID.
 * Remplace : fetchCritereById
 */
export async function getCritereById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criteres')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Critere
}

/**
 * Récupère tous les critères d'une catégorie avec hiérarchie parent/enfants.
 */
export async function getCriteresHierarchie(categorieId: string): Promise<CritereWithChildren[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criteres')
    .select('*, categorie:categories!inner(id)')
    .eq('categorie.id', categorieId)

  if (error) throw error

  const criteres = data as unknown as Critere[]

  // Construire la hiérarchie via is_parent/is_enfant (parent_id n'existe pas en base)
  const parentCriteres = criteres.filter((c) => c.is_parent || !c.is_enfant)

  return parentCriteres.map((parent) => ({
    ...parent,
    children: [],
  }))
}
