import { getYouTubeId, youTubeThumbnailUrl, youTubeWatchUrl } from '@/lib/youtube'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://100000medecins.org'

/** Lien partagé pour un article du blog. */
export function lienArticle(slug: string | null | undefined): string | undefined {
  return slug ? `${SITE_URL}/blog/${slug}` : undefined
}

/** Lien YouTube canonique et image d'une vidéo (vignette enregistrée, sinon vignette YouTube JPEG). */
export function lienEtImageVideo(url: string | null | undefined, vignette: string | null | undefined): { lien?: string; image: string | null } {
  const id = getYouTubeId(url)
  return {
    lien: id ? youTubeWatchUrl(id) : url ?? undefined,
    image: vignette ?? (id ? youTubeThumbnailUrl(id) : null),
  }
}
