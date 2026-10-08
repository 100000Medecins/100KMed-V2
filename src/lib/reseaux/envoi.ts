import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { lienArticle, lienEtImageVideo } from './liens'
import type { PostReseau, SourcePost } from './types'

type Client = ReturnType<typeof createServiceRoleClient>

export function sourceDuPost(post: PostReseau): SourcePost {
  return post.article_id ? { type: 'article', id: post.article_id } : { type: 'video', id: post.video_id! }
}

/** Posts d'un article ou d'une vidéo, du plus récent au plus ancien. */
export async function listerPosts(source: SourcePost): Promise<PostReseau[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('posts_reseaux')
    .select('*')
    .eq(source.type === 'article' ? 'article_id' : 'video_id', source.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Lien et image lus au moment de l'envoi : une couverture changée entre-temps est prise en compte. */
async function lienEtImage(supabase: Client, post: PostReseau): Promise<{ lien: string | null; image: string | null }> {
  if (post.article_id) {
    const { data } = await supabase.from('articles').select('slug, image_couverture').eq('id', post.article_id).single()
    return { lien: lienArticle(data?.slug) ?? null, image: post.image_url ?? data?.image_couverture ?? null }
  }
  const { data } = await supabase.from('videos').select('url, vignette').eq('id', post.video_id!).single()
  const video = lienEtImageVideo(data?.url, data?.vignette)
  return { lien: video.lien ?? null, image: post.image_url ?? video.image }
}

/**
 * Transmet à Make un post déjà passé « en_cours », puis enregistre le résultat.
 * « envoye » signifie reçu par Make : la publication sur le réseau se vérifie dans l'historique Make.
 */
export async function transmettre(supabase: Client, post: PostReseau): Promise<void> {
  const { lien, image } = await lienEtImage(supabase, post)
  let erreur: string | null = null

  if (!process.env.MAKE_WEBHOOK_URL) {
    erreur = 'MAKE_WEBHOOK_URL non configuré'
  } else if (post.reseau === 'instagram' && !image) {
    erreur = 'Instagram exige une image'
  } else {
    try {
      const res = await fetch(process.env.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Noms de champs attendus par le scénario Make (article_url vaut aussi pour une vidéo).
        body: JSON.stringify({ network: post.reseau, text: post.texte, scheduled_at: null, image_url: image, article_url: lien }),
      })
      if (!res.ok) erreur = `Make : ${(await res.text()).slice(0, 300)}`
    } catch (e) {
      erreur = `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`
    }
  }

  const maintenant = new Date().toISOString()
  await supabase
    .from('posts_reseaux')
    .update(erreur
      ? { statut: 'erreur', erreur, updated_at: maintenant }
      : { statut: 'envoye', envoye_le: maintenant, erreur: null, updated_at: maintenant })
    .eq('id', post.id)
}
