import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Resultat, ResultatWithCritere, ComparaisonSolution } from '@/types/models'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Récupère les résultats par type de critère pour une solution.
 * Remplace : fetchResultatsByType
 */
export async function getResultatsByType(
  categorieId: string,
  solutionId: string,
  type: string
) {
  if (!UUID_RE.test(solutionId)) return [] as ResultatWithCritere[]

  const supabase = await createServerClient()

  // D'abord trouver les IDs de critères pour cette catégorie et type
  const { data: critereIds, error: critError } = await supabase
    .from('criteres')
    .select('id, categorie:categories!inner(id)')
    .eq('categorie.id', categorieId)
    .eq('type', type)

  if (critError) throw critError

  const ids = (critereIds ?? []).map((c) => c.id)
  if (ids.length === 0) return [] as ResultatWithCritere[]

  const { data, error } = await supabase
    .from('resultats')
    .select(`
      *,
      critere:criteres(*)
    `)
    .eq('solution_id', solutionId)
    .in('critere_id', ids)

  if (error) throw error
  return data as unknown as ResultatWithCritere[]
}

/**
 * Récupère un résultat unique par type de critère (ex: note générale).
 * Remplace : fetchResultatByTypeCritere
 */
export async function getResultatByTypeCritere(
  categorieId: string,
  solutionId: string,
  typeCritere: string
) {
  if (!UUID_RE.test(solutionId)) return null

  const supabase = await createServerClient()

  // D'abord trouver le critère de ce type via jointure catégorie
  const { data: critereData, error: critereError } = await supabase
    .from('criteres')
    .select('id, categorie:categories!inner(id)')
    .eq('categorie.id', categorieId)
    .eq('type', typeCritere)
    .limit(1)
    .single()

  if (critereError) return null

  const { data, error } = await supabase
    .from('resultats')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('critere_id', critereData.id)
    .single()

  if (error) return null
  return data as Resultat
}

/**
 * Récupère un résultat par ID de critère.
 * Remplace : fetchResultatByIdCritere
 */
export async function getResultatByIdCritere(
  solutionId: string,
  critereId: string
) {
  if (!UUID_RE.test(solutionId)) return null

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('resultats')
    .select(`
      *,
      critere:criteres(*)
    `)
    .eq('solution_id', solutionId)
    .eq('critere_id', critereId)
    .single()

  if (error) return null
  return data as unknown as ResultatWithCritere
}

/**
 * Récupère les données de comparaison pour une solution.
 * Remplace : fetchResultatComparaison
 *
 * Note : la logique de comparaison est complexe (agrège par groupes de critères).
 * Ici on récupère tous les résultats + critères, le formatage en ComparaisonSolution
 * sera fait côté composant ou dans un helper dédié.
 */
export async function getResultatsComparaison(solutionId: string) {
  if (!UUID_RE.test(solutionId)) return [] as ResultatWithCritere[]

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('resultats')
    .select(`
      *,
      critere:criteres(*)
    `)
    .eq('solution_id', solutionId)
    .not('critere', 'is', null)

  if (error) throw error
  return data as unknown as ResultatWithCritere[]
}

/**
 * Récupère tous les résultats pour une solution (tous critères).
 */
export async function getAllResultats(solutionId: string) {
  // resultats.solution_id est UUID — retourner vide si l'ID n'est pas un UUID
  if (!UUID_RE.test(solutionId)) return [] as ResultatWithCritere[]

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('resultats')
    .select(`
      *,
      critere:criteres(*)
    `)
    .eq('solution_id', solutionId)

  if (error) throw error
  return data as unknown as ResultatWithCritere[]
}
