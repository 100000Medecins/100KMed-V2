/** Identifiant d'une vidéo YouTube (watch, embed, shorts, youtu.be), ou null. */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

/** Adresse de partage canonique (sans paramètre de suivi `si=`). */
export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

/** Vignette JPEG (hqdefault existe pour toutes les vidéos, contrairement à maxresdefault). */
export function youTubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
