import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Revalide les pages impactées par une modification d'UNE solution :
 * - le **listing** `/solutions` (page seule),
 * - **la fiche individuelle** `/solutions/{slugCategorie}/{slugSolution}`.
 *
 * ⚠️ On revalide `/solutions` en **page**, PAS en `'layout'` : le mode `'layout'`
 * invalide tout le sous-arbre `/solutions/**` (les ~139 fiches) → un re-rendu massif
 * inutile alors qu'une seule solution a changé. Appelé à chaque évaluation, c'était
 * le 1er poste de CPU Vercel Fluid (cf `recalcResultatsPourSolution`). Ici on ne
 * touche QUE le listing + la fiche concernée. Le slug catégorie est résolu depuis l'id.
 */
export async function revalidateSolution(
  solutionSlug: string | null | undefined,
  categorieId: string | null | undefined
): Promise<void> {
  // Listing `/solutions` uniquement (page, PAS 'layout' → ne cascade pas aux 139 fiches)
  revalidatePath('/solutions')

  if (!solutionSlug || !categorieId) return

  const supabase = createServiceRoleClient()
  const { data: cat } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', categorieId)
    .maybeSingle()

  if (cat?.slug) {
    revalidatePath(`/solutions/${cat.slug}/${solutionSlug}`)
  }
}

/**
 * Variante de `revalidateSolution` quand on n'a que l'id de la solution.
 * Résout `slug` + `id_categorie` puis délègue.
 *
 * Utile pour les chemins qui changent l'affichage public d'une fiche **sans**
 * toucher aux agrégats (commentaire modifié, reconfirmation d'un avis qui
 * réordonne la liste des témoignages) : ils n'ont pas de raison de passer par
 * `recalcResultatsPourSolution`, mais doivent quand même casser le cache ISR.
 */
export async function revalidateSolutionById(solutionId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('solutions')
    .select('slug, id_categorie')
    .eq('id', solutionId)
    .maybeSingle()

  await revalidateSolution(data?.slug, data?.id_categorie)
}
