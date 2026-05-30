import { createServiceRoleClient } from '@/lib/supabase/server'

export type LienType = 'meme_suite' | 'interoperable' | 'embedded' | 'partenariat' | (string & {})

export type SolutionLienVoisin = {
  lienId: string
  type: LienType
  description: string | null
  solution: {
    id: string
    nom: string
    slug: string | null
    logo_url: string | null
    categorie: { slug: string | null; nom: string | null } | null
  }
}

/**
 * Récupère toutes les solutions reliées à une solution donnée.
 * Lien non-dirigé : on cherche dans les deux colonnes, on retourne l'autre côté.
 */
export async function getSolutionsLiees(solutionId: string): Promise<SolutionLienVoisin[]> {
  try {
    const supabase = createServiceRoleClient()

    // Étape 1 : récupérer les liens bruts (sans jointure pour éviter les pièges PostgREST)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: liens, error } = await (supabase as any)
      .from('solution_liens')
      .select('id, type, description, solution_a_id, solution_b_id')
      .or(`solution_a_id.eq.${solutionId},solution_b_id.eq.${solutionId}`)

    if (error) {
      console.error('[getSolutionsLiees] step1', JSON.stringify(error))
      return []
    }
    const liensTyped = (liens ?? []) as Array<{ id: string; type: string; description: string | null; solution_a_id: string; solution_b_id: string }>
    if (liensTyped.length === 0) return []

    // Étape 2 : récupérer les solutions voisines (l'autre id) en bloc.
    // On ne garde que les solutions actives ET dont la catégorie est active
    // (sinon, lien fantôme vers une fiche invisible côté public).
    const voisinIds = Array.from(new Set(liensTyped.map((l) => l.solution_a_id === solutionId ? l.solution_b_id : l.solution_a_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: solutions, error: solErr } = await (supabase as any)
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories!inner(slug, nom, actif)')
      .in('id', voisinIds)
      .eq('actif', true)
      .eq('categorie.actif', true)
    if (solErr) {
      console.error('[getSolutionsLiees] step2', JSON.stringify(solErr))
      return []
    }
    const solMap = new Map<string, SolutionLienVoisin['solution']>()
    for (const s of (solutions ?? []) as Array<SolutionLienVoisin['solution']>) {
      solMap.set(s.id, s)
    }

    return liensTyped.map((l) => {
      const voisinId = l.solution_a_id === solutionId ? l.solution_b_id : l.solution_a_id
      const voisin = solMap.get(voisinId)
      return voisin ? {
        lienId: l.id,
        type: l.type as LienType,
        description: l.description,
        solution: voisin,
      } : null
    }).filter((v): v is SolutionLienVoisin => v !== null)
  } catch (e) {
    console.error('[getSolutionsLiees] unexpected', e)
    return []
  }
}
