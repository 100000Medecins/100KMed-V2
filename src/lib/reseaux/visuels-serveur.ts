import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { BUCKET_VISUELS, estFormatVisuel, nettoyerReglages, type VisuelsArticle } from './visuels'

type Client = ReturnType<typeof createServiceRoleClient>

/** Visuels enregistrés d'un article, par format. */
export async function lireVisuelsDe(supabase: Client, articleId: string): Promise<VisuelsArticle> {
  const { data } = await supabase.from('visuels_reseaux').select('format, url, reglages, updated_at').eq('article_id', articleId)
  const visuels: VisuelsArticle = {}
  for (const v of data ?? []) {
    const reglages = nettoyerReglages(v.reglages)
    if (reglages && estFormatVisuel(v.format)) visuels[v.format] = { format: v.format, url: v.url, reglages, enregistreLe: v.updated_at }
  }
  return visuels
}

/** Adresse publique du visuel 4:5 (post) de l'article, celui que reçoit Instagram ; null sans visuel. */
export async function adresseVisuelPost(supabase: Client, articleId: string): Promise<string | null> {
  const { data } = await supabase.from('visuels_reseaux').select('url').eq('article_id', articleId).eq('format', 'post').maybeSingle()
  return data?.url ?? null
}

/**
 * À appeler avant de supprimer un article : ses lignes partent en cascade, pas ses fichiers.
 * Vide tout le dossier de l'article, dépôts interrompus compris.
 */
export async function supprimerVisuelsDeLArticle(supabase: Client, articleId: string): Promise<void> {
  const stockage = supabase.storage.from(BUCKET_VISUELS)
  const { data } = await stockage.list(articleId, { limit: 1000 })
  const chemins = (data ?? []).filter((o) => o.id).map((o) => `${articleId}/${o.name}`)
  if (chemins.length) await stockage.remove(chemins)
}
