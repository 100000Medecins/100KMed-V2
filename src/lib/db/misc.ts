import { createServerClient } from '@/lib/supabase/server'
import type { Avatar, Video, Actualite, DocumentRow, Tag, Critere } from '@/types/models'

/**
 * Récupère tous les avatars disponibles.
 * Remplace : fetchAvatars
 */
export async function getAvatars() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('avatars')
    .select('*')

  if (error) throw error
  return data as Avatar[]
}

/**
 * Récupère les vidéos, optionnellement filtrées par "principales".
 * Remplace : fetchVideos
 */
export async function getVideos(isVideosPrincipales?: boolean) {
  const supabase = await createServerClient()

  let query = supabase
    .from('videos')
    .select('*')
    .order('ordre', { ascending: true })

  if (isVideosPrincipales !== undefined) {
    query = query.eq('is_videos_principales', isVideosPrincipales)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Video[]
}

/**
 * Récupère les actualités, avec limite optionnelle.
 * Remplace : fetchActualites
 */
export async function getActualites(limit?: number) {
  const supabase = await createServerClient()

  let query = supabase
    .from('actualites')
    .select('*')
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Actualite[]
}

/**
 * Récupère les tags d'une catégorie.
 * Remplace : fetchTags
 */
export async function getTags(categorieId: string) {
  const supabase = await createServerClient()

  // 1. Récupérer les solutions de cette catégorie
  const { data: solutions, error: solError } = await supabase
    .from('solutions')
    .select('id')
    .eq('id_categorie', categorieId)

  if (solError) throw solError
  if (!solutions || solutions.length === 0) return []

  const solutionIds = solutions.map((s) => s.id)

  // 2. Récupérer les tag IDs liés à ces solutions
  const { data: links, error: linksError } = await supabase
    .from('solutions_tags')
    .select('id_tag')
    .in('id_solution', solutionIds)

  if (linksError) throw linksError

  const tagIds = Array.from(new Set((links || []).map((l) => l.id_tag)))
  if (tagIds.length === 0) return []

  // 3. Récupérer les tags
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .in('id', tagIds)
    .order('ordre', { ascending: true })

  if (error) throw error
  return data as Tag[]
}

/**
 * Récupère les tags principaux d'une solution.
 * Remplace : getTagsPrincipaux (sous-resolver Solution.tagsPrincipaux)
 */
export async function getTagsPrincipauxForSolution(solutionId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_tags')
    .select(`
      tag:tags(*)
    `)
    .eq('solution_id', solutionId)
    .eq('tag.is_tag_principal', true)
    .not('tag', 'is', null)

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => row.tag).filter(Boolean) as Tag[]
}

/**
 * Récupère les 5 critères majeurs (INTERFACE, FONCTIONNALITÉS, etc.)
 * via les resultats des solutions de la catégorie.
 */
export async function getCriteresMajeurs(categorieId: string): Promise<Critere[]> {
  const supabase = await createServerClient()

  // Solutions de la catégorie
  const { data: sols } = await supabase
    .from('solutions')
    .select('id, categorie:categories!inner(id)')
    .eq('categorie.id', categorieId)
    .limit(5)

  if (!sols || sols.length === 0) return []

  // Critère IDs dans les résultats de ces solutions
  const { data: ress } = await supabase
    .from('resultats')
    .select('critere_id')
    .in('solution_id', sols.map((s) => s.id))
    .not('critere_id', 'is', null)

  if (!ress || ress.length === 0) return []

  const ids = Array.from(new Set(ress.map((r) => r.critere_id as string)))

  // Critères avec nom_capital parmi ces IDs (sans .order() — colonne inexistante)
  const { data } = await supabase
    .from('criteres')
    .select('*')
    .in('id', ids)
    .not('nom_capital', 'is', null)

  return (data ?? []) as Critere[]
}

/**
 * Récupère les documents.
 */
export async function getDocuments() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('ordre', { ascending: true })

  if (error) throw error
  return data as DocumentRow[]
}
