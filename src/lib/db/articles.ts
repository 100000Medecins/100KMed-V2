import { createServiceRoleClient } from '@/lib/supabase/server'

export interface ArticleHistoryEntry {
  id: string
  article_id: string
  slug: string
  titre: string | null
  contenu: string | null
  extrait: string | null
  image_couverture: string | null
  meta_description: string | null
  id_categorie: string | null
  statut: string | null
  saved_at: string
  saved_by: string | null
}

/**
 * Liste les versions historisées d'un article (la plus récente d'abord).
 * Lecture admin uniquement : utilise service_role (la table est en RLS sans policy).
 */
export async function getArticleHistory(
  articleId: string,
  limit = 50
): Promise<ArticleHistoryEntry[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('articles_history')
    .select('*')
    .eq('article_id', articleId)
    .order('saved_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ArticleHistoryEntry[]
}
