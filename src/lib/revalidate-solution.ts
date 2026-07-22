import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Revalide les pages impactées par une modification de solution :
 * - les listings (`/solutions`, `/solutions/[cat]`) via le layout,
 * - **la fiche individuelle** `/solutions/{slugCategorie}/{slugSolution}`.
 *
 * Le layout seul ne revalide PAS la fiche (route dynamique en ISR 1h) : sans le
 * `revalidatePath` ciblé ci-dessous, une modif (contacts, mot éditeur, prix…)
 * peut mettre jusqu'à 1h à s'afficher. Le slug catégorie est résolu depuis l'id.
 */
export async function revalidateSolution(
  solutionSlug: string | null | undefined,
  categorieId: string | null | undefined
): Promise<void> {
  // Listings (toujours)
  revalidatePath('/solutions', 'layout')

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
