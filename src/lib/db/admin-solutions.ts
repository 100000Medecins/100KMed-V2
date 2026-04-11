import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Toutes les solutions pour l'admin (y compris inactives).
 * Bypass RLS via service role.
 */
export async function getAllSolutionsAdmin() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('solutions')
    .select(`
      *,
      editeur:editeurs(id, nom),
      categorie:categories(id, nom)
    `)
    .order('nom', { ascending: true })

  if (error) throw error
  return data as unknown as Array<{
    id: string
    nom: string
    actif: boolean | null
    editeur: { id: string; nom: string | null } | null
    categorie: { id: string; nom: string | null } | null
    [key: string]: unknown
  }>
}

/**
 * Une solution par ID pour édition admin.
 * Inclut la galerie et la note de rédaction (depuis resultats).
 */
export async function getSolutionByIdAdmin(id: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('solutions')
    .select(`
      *,
      categorie:categories(id, nom),
      galerie:solutions_galerie(id, url, titre, ordre)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  const typedData = data as unknown as {
    galerie: Array<{ id: string; url: string; titre: string | null; ordre: number | null }>
    categorie: { id: string; nom: string } | null
  }
  const galerie = typedData.galerie ?? []

  const raw = data as Record<string, unknown>

  return {
    ...data,
    categorie_id: typedData.categorie?.id ?? null,
    editeur_id: raw.id_editeur as string | null,
    website_url: raw.website as string | null,
    date_lancement: raw.lancement as string | null,
    meta_title: ((raw.meta as Record<string, string | null>) ?? {}).title ?? null,
    meta_description: ((raw.meta as Record<string, string | null>) ?? {}).description ?? null,
    meta_canonical: ((raw.meta as Record<string, string | null>) ?? {}).canonical ?? null,
    note_redac_base5: raw.evaluation_redac_note as number | null ?? null,
    galerie,
  }
}

export type SolutionAdmin = Awaited<ReturnType<typeof getSolutionByIdAdmin>>

/**
 * Récupère les résultats de la rédaction pour une solution (admin).
 * Source : table resultats + criteres, filtrés sur nom_capital non null.
 */
export async function getResultatsRedacAdmin(solutionId: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('resultats')
    .select(`
      id,
      critere_id,
      note_redac_base5,
      avis_redac,
      critere:criteres(nom_capital, nom_court)
    `)
    .eq('solution_id', solutionId)

  if (error || !data) return []

  return data
    .filter((r) => {
      const c = (r.critere as unknown) as { nom_capital: string | null } | null
      return c?.nom_capital != null
    })
    .map((r) => {
      const c = (r.critere as unknown) as { nom_capital: string; nom_court: string | null }
      return {
        id: r.id as string,
        critere_id: r.critere_id as string,
        label: c.nom_capital,
        note_redac_base5: r.note_redac_base5 as number | null,
        avis_redac: r.avis_redac as string | null,
      }
    })
}

export type ResultatRedacAdmin = Awaited<ReturnType<typeof getResultatsRedacAdmin>>[number]

/**
 * Récupère tous les tags d'une catégorie avec leur état pour une solution.
 * enabled = présent dans solutions_tags
 * is_principale = solutions_tags.is_tag_principal = true
 */
export async function getTagsForSolutionAdmin(solutionId: string, categorieId: string | null) {
  const supabase = createServiceRoleClient()

  const tagsQuery = supabase.from('tags').select('id, libelle, ordre, is_separator')
  const { data: tags } = categorieId
    ? await tagsQuery.eq('id_categorie', categorieId).order('ordre', { ascending: true })
    : await tagsQuery.is('id_categorie', null).order('ordre', { ascending: true })

  const { data: solutionTags } = await supabase
    .from('solutions_tags')
    .select('id_tag, is_tag_principal')
    .eq('id_solution', solutionId)

  // map tagId -> is_tag_principal
  const stMap = new Map<string, boolean>()
  for (const st of solutionTags || []) {
    if (st.id_tag) stMap.set(st.id_tag, st.is_tag_principal ?? false)
  }

  return (tags || [])
    .filter((tag) => !((tag as unknown as Record<string, unknown>).is_separator as boolean))
    .map((tag) => ({
      id: tag.id as string,
      libelle: tag.libelle as string | null,
      ordre: tag.ordre as number | null,
      parent_ids: ((tag as unknown as Record<string, unknown>).parent_ids as string[] | null) ?? [],
      enabled: stMap.has(tag.id),
      is_principale: stMap.get(tag.id) === true,
    }))
}

export type TagForSolution = Awaited<ReturnType<typeof getTagsForSolutionAdmin>>[number]

/**
 * Récupère tous les tags d'une catégorie pour l'admin catégorie (CRUD).
 */
export async function getTagsForCategorieAdmin(categorieId: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await (supabase as any)
    .from('tags')
    .select('id, libelle, ordre, is_separator, parent_ids')
    .eq('id_categorie', categorieId)
    .order('ordre', { ascending: true })

  if (error) return []

  return (data || []).map((tag: Record<string, unknown>) => ({
    id: tag.id as string,
    libelle: tag.libelle as string | null,
    ordre: tag.ordre as number | null,
    parent_ids: ((tag as unknown as Record<string, unknown>).parent_ids as string[] | null) ?? [],
    is_separator: ((tag as unknown as Record<string, unknown>).is_separator as boolean) ?? false,
  }))
}

export type TagForCategorie = Awaited<ReturnType<typeof getTagsForCategorieAdmin>>[number]
