import { createServerClient } from '@/lib/supabase/server'
import type { SolutionWithRelations, SolutionWithResultat } from '@/types/models'

/**
 * Récupère toutes les solutions, avec filtres optionnels.
 * Remplace : fetchSolutions, fetchSolutionsByCategorie, fetchSolutionsByEditeur
 */
export async function getSolutions(options?: {
  categorieId?: string
  editeurId?: string
  limit?: number
}) {
  const supabase = await createServerClient()

  // Si on filtre par catégorie, utiliser un INNER JOIN pour filtrer via la FK
  const categorieJoin = options?.categorieId
    ? 'categorie:categories!inner(*)'
    : 'categorie:categories(*)'

  let query = supabase
    .from('solutions')
    .select(`*, editeur:editeurs(*), ${categorieJoin}`)
    .order('nom', { ascending: true })

  if (options?.categorieId) {
    query = query.eq('categorie.id', options.categorieId)
  }

  if (options?.editeurId) {
    query = query.eq('id_editeur', options.editeurId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data as unknown as SolutionWithResultat[]
}

/**
 * Récupère une solution par son ID avec toutes ses relations.
 * Remplace : fetchSolutionByIdSolution + sous-resolvers (editeur, categorie, tags)
 */
export async function getSolutionById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions')
    .select(`
      *,
      editeur:editeurs(*),
      categorie:categories(*),
      galerie:solutions_galerie(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // Fetch tags séparément (solutions_tags n'a pas de FK vers tags)
  const { data: tagRows } = await supabase
    .from('solutions_tags')
    .select('id_tag')
    .eq('id_solution', id)

  let tags: Array<{ tag: Record<string, unknown> }> = []
  if (tagRows && tagRows.length > 0) {
    const tagIds = tagRows.map((r: { id_tag: string }) => r.id_tag)
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds)
    tags = (tagsData || []).map((t: Record<string, unknown>) => ({ tag: t }))
  }

  return { ...data, tags } as unknown as SolutionWithRelations
}

/**
 * Récupère une solution par son slug avec toutes ses relations.
 */
export async function getSolutionBySlug(slug: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions')
    .select(`
      *,
      editeur:editeurs(*),
      categorie:categories(*),
      galerie:solutions_galerie(*)
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error

  const { data: tagRows } = await supabase
    .from('solutions_tags')
    .select('id_tag')
    .eq('id_solution', data.id)

  let tags: Array<{ tag: Record<string, unknown> }> = []
  if (tagRows && tagRows.length > 0) {
    const tagIds = tagRows.map((r: { id_tag: string }) => r.id_tag)
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds)
    tags = (tagsData || []).map((t: Record<string, unknown>) => ({ tag: t }))
  }

  return { ...data, tags } as unknown as SolutionWithRelations
}

/**
 * Récupère les solutions filtrées par tags.
 * Remplace : fetchSolutionsByTags
 */
export async function getSolutionsByTags(categorieId: string, tagIds: string[]) {
  const supabase = await createServerClient()

  // Trouver les solution_ids qui ont les tags demandés
  const { data: solutionTagRows, error: tagError } = await supabase
    .from('solutions_tags')
    .select('id_solution')
    .in('id_tag', tagIds)

  if (tagError) throw tagError

  const solutionIds = Array.from(new Set(solutionTagRows.map((row) => row.id_solution)))

  if (solutionIds.length === 0) return []

  const { data, error } = await supabase
    .from('solutions')
    .select(`*, editeur:editeurs(*), categorie:categories!inner(*)`)
    .eq('categorie.id', categorieId)
    .in('id', solutionIds)
    .order('nom', { ascending: true })

  if (error) throw error
  return data as unknown as SolutionWithResultat[]
}

/**
 * Récupère les solutions par catégorie et type (ex: les mieux notées).
 * Remplace : fetchSolutionsByCategorieAndType
 */
export async function getSolutionsByCategorieAndType(
  categorieId: string,
  type: string,
  limit: number
) {
  const supabase = await createServerClient()

  let query = supabase
    .from('solutions')
    .select(`*, editeur:editeurs(*), categorie:categories!inner(*)`)
    .eq('categorie.id', categorieId)

  // Le "type" dans le backend legacy sert à trier différemment
  if (type === 'meilleure_note') {
    query = query.order('date_publication', { ascending: false })
  } else {
    query = query.order('nom', { ascending: true })
  }

  query = query.limit(limit)

  const { data, error } = await query

  if (error) throw error
  return data as unknown as SolutionWithResultat[]
}

/**
 * Génère les paramètres statiques pour ISR.
 */
export async function getAllSolutionIds() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions')
    .select('id, categorie:categories(id)')

  if (error) throw error
  return data.map((sol) => ({
    id: sol.id,
    categorie_id: (sol.categorie as unknown as { id: string } | null)?.id ?? null,
  }))
}

/**
 * Récupère les notes_redac pour une solution (page publique).
 */
export async function getNotesRedac(solutionId: string) {
  const supabase = await createServerClient()

  const { data: notes, error } = await supabase
    .from('notes_redac')
    .select('*')
    .eq('id_solution', solutionId)
    .neq('identifiant_tech', '_note_globale')
    .order('identifiant_tech', { ascending: true })

  if (error || !notes) return []

  const techIds = notes.map((n) => n.identifiant_tech)
  const labelsMap = new Map<string, string>()
  if (techIds.length > 0) {
    const { data: criteres } = await supabase
      .from('criteres')
      .select('identifiant_tech, nom_court')
      .in('identifiant_tech', techIds)
    for (const c of criteres ?? []) {
      if (c.identifiant_tech && c.nom_court) {
        labelsMap.set(c.identifiant_tech, c.nom_court)
      }
    }
  }

  return notes.map((n) => {
    const note = n.note as number | null
    return {
      id: n.id as number,
      label: labelsMap.get(n.identifiant_tech) ?? `Critère ${n.identifiant_tech}`,
      note_base5: note != null ? Math.round((note / 2) * 10) / 10 : null,
      avis: n.avis as string | null,
    }
  })
}

export type NoteRedac = Awaited<ReturnType<typeof getNotesRedac>>[number]

/**
 * Récupère la note globale de la rédaction pour une liste de solutions.
 * Retourne un map solutionId -> note en base 5.
 */
export async function getNotesGlobalesRedac(solutionIds: string[]): Promise<Record<string, number>> {
  if (solutionIds.length === 0) return {}

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions')
    .select('id, evaluation_redac_note')
    .in('id', solutionIds)
    .not('evaluation_redac_note', 'is', null)

  if (error || !data) return {}

  const map: Record<string, number> = {}
  for (const row of data) {
    const note = row.evaluation_redac_note as number | null
    if (note != null) {
      map[row.id] = note
    }
  }
  return map
}
