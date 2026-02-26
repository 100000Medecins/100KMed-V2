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
    editeur: { id: string; nom: string } | null
    categorie: { id: string; nom: string } | null
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
 * Récupère les notes_redac pour une solution.
 * Chaque entrée a un identifiant_tech (1-5) qu'on mappe au nom_court du critère.
 */
export async function getNotesRedacAdmin(solutionId: string) {
  const supabase = createServiceRoleClient()

  // Récupérer les notes_redac de cette solution
  const { data: notes, error } = await supabase
    .from('notes_redac')
    .select('*')
    .eq('id_solution', solutionId)
    .neq('identifiant_tech', '_note_globale')
    .order('identifiant_tech', { ascending: true })

  if (error) return []

  // Récupérer le mapping identifiant_tech -> nom_court depuis criteres
  const techIds = (notes ?? []).map((n) => n.identifiant_tech)
  let labelsMap = new Map<string, string>()
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

  return (notes ?? []).map((n) => {
    const note = n.note as number | null
    return {
      id: n.id as number,
      identifiant_tech: n.identifiant_tech as string,
      label: labelsMap.get(n.identifiant_tech) ?? `Critère ${n.identifiant_tech}`,
      note,
      note_base5: note != null ? Math.round((note / 2) * 10) / 10 : null,
      avis: n.avis as string | null,
    }
  })
}

export type NoteRedacAdmin = Awaited<ReturnType<typeof getNotesRedacAdmin>>[number]
