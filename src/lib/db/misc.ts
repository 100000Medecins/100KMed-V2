import { createServerClient } from '@/lib/supabase/server'
import type { Avatar, Actualite, DocumentRow, Tag, Critere } from '@/types/models'

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
export type VideoRubrique = {
  id: string
  nom: string
  ordre: number
}

export type VideoRow = {
  id: string
  titre: string | null
  description: string | null
  url: string | null
  vignette: string | null
  type: string | null
  theme: string | null
  statut: string | null
  ordre: number | null
  is_videos_principales: boolean | null
  rubrique_id: string | null
  rubrique?: VideoRubrique | null
}

export async function getVideoRubriques(): Promise<VideoRubrique[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_rubriques')
    .select('*')
    .order('ordre', { ascending: true })
  return data ?? []
}

export async function getVideos(options?: {
  isVideosPrincipales?: boolean
  onlyPublished?: boolean
  limit?: number
}) {
  const supabase = await createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('videos')
    .select('*, rubrique:video_rubriques(*)')
    .order('ordre', { ascending: true })

  if (options?.isVideosPrincipales !== undefined) {
    query = query.eq('is_videos_principales', options.isVideosPrincipales)
  }

  if (options?.onlyPublished !== false) {
    query = query.eq('statut', 'publie')
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as VideoRow[]
}

/**
 * Récupère les actualités, avec limite optionnelle.
 * Remplace : fetchActualites
 */
export async function getActualites(limit?: number) {
  const supabase = await createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
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
 * Récupère les tags d'une catégorie (directement depuis id_categorie).
 * Remplace : fetchTags
 */
export async function getTags(categorieId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id_categorie', categorieId)
    .order('ordre', { ascending: true })

  if (error) throw error
  return (data ?? []) as Tag[]
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('documents')
    .select('*')
    .order('ordre', { ascending: true })

  if (error) throw error
  return data as DocumentRow[]
}
