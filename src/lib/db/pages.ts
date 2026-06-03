import { createServerClient } from '@/lib/supabase/server'
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
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
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
