import { createServerClient, createPublicClient } from '@/lib/supabase/server'
import type { PageStatique } from '@/types/models'

export async function getPagesStatiques(): Promise<PageStatique[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .order('titre', { ascending: true })

  if (error) throw error
  return data as PageStatique[]
}

export async function getPageBySlug(slug: string): Promise<PageStatique> {
  // Lecture publique (contenu éditorial) → client anon sans cookies pour rester cacheable ISR.
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as PageStatique
}

/**
 * Variante de `getPageBySlug` qui distingue les 2 cas d'échec :
 *   - Page absente en BDD (code Supabase `PGRST116`) → renvoie `null` (l'appelant
 *     peut alors `notFound()` proprement, c'est une 404 légitime).
 *   - Autre erreur (BDD en panne, GRANT manquant, etc.) → propage l'exception
 *     pour déclencher `error.tsx` (avec ref d'erreur pour diagnostic), au lieu
 *     de masquer un problème système derrière un faux 404.
 *
 * Utiliser cette variante dans les pages publiques où on veut faire la
 * distinction (qui-sommes-nous, lancement-100k, etc.) plutôt que `getPageBySlug`
 * dans un `try { } catch { notFound() }` qui masque tout.
 */
export async function getPageBySlugOrNull(slug: string): Promise<PageStatique | null> {
  // Lecture publique (contenu éditorial) → client anon sans cookies pour rester cacheable ISR.
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    // PGRST116 = "no rows returned" : page légitimement absente, pas une erreur système.
    if (error.code === 'PGRST116') return null
    console.error(`[getPageBySlugOrNull] erreur Supabase pour slug='${slug}':`, error.message)
    throw error
  }
  return data as PageStatique
}

export interface PageStatiqueHistoryEntry {
  id: string
  page_id: string
  slug: string
  titre: string | null
  contenu: string | null
  meta_description: string | null
  image_couverture: string | null
  metadata: unknown
  saved_at: string
  saved_by: string | null
}

/**
 * Liste les versions historisées d'une page (la plus récente d'abord).
 * Lecture admin uniquement : utilise service_role (la table est en RLS sans policy).
 */
export async function getPageStatiqueHistory(
  pageId: string,
  limit = 50
): Promise<PageStatiqueHistoryEntry[]> {
  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pages_statiques_history')
    .select('*')
    .eq('page_id', pageId)
    .order('saved_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as PageStatiqueHistoryEntry[]
}
