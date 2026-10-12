import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { RESEAU_PAR_FORMAT, formatDuReseau, type FichierVideo, type FormatFichier, type PostReseau } from './types'

type Client = ReturnType<typeof createServiceRoleClient>

/** Bucket privé : dépôt et lecture par adresses signées seulement, aucune règle d'accès. */
export const BUCKET_VIDEOS = 'videos-reseaux'

// Instagram et Facebook téléchargent le fichier après la transmission à Make : 24 h laissent
// le temps de relancer le scénario Make le jour même s'il échoue.
const VALIDITE_LECTURE_S = 24 * 3600

const JOUR = 24 * 3600 * 1000
// Délais d'effacement, comptés depuis la dernière activité autour du fichier (dépôt, ou
// modification / envoi d'un post en vidéo du réseau concerné).
const DELAI_APRES_PUBLICATION = 7 * JOUR
const DELAI_JAMAIS_PUBLIE = 30 * JOUR
// Une adresse de dépôt vaut 2 h : au-delà d'un jour, un fichier sans ligne en base est un dépôt abandonné.
const DELAI_DEPOT_ABANDONNE = JOUR

/** Fichiers déposés pour une vidéo. */
export async function listerFichiers(videoId: string): Promise<FichierVideo[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('videos_fichiers').select('*').eq('video_id', videoId)
  return data ?? []
}

/** Fichier que le réseau du post publierait (vertical pour Instagram, horizontal pour Facebook). */
export async function fichierDuPost(supabase: Client, post: PostReseau): Promise<FichierVideo | null> {
  const format = formatDuReseau(post.reseau)
  if (!format || !post.video_id) return null
  const { data } = await supabase.from('videos_fichiers').select('*').eq('video_id', post.video_id).eq('format', format).maybeSingle()
  return data
}

/** Adresse signée du fichier d'un post en vidéo, ou la raison pour laquelle il ne peut pas partir. */
export async function adresseVideo(supabase: Client, post: PostReseau): Promise<{ url: string } | { erreur: string }> {
  const format = formatDuReseau(post.reseau)
  if (!format) return { erreur: 'Ce réseau ne publie pas de fichier vidéo' }
  const fichier = await fichierDuPost(supabase, post)
  if (!fichier) return { erreur: `Fichier ${format} manquant : déposez-le, ou repassez le post en « image »` }
  const { data, error } = await supabase.storage.from(BUCKET_VIDEOS).createSignedUrl(fichier.chemin, VALIDITE_LECTURE_S)
  return data ? { url: data.signedUrl } : { erreur: `Fichier ${format} illisible : ${error.message}` }
}

/** À appeler avant de supprimer une vidéo : ses lignes partent en cascade, pas ses fichiers. */
export async function supprimerFichiersDeLaVideo(supabase: Client, videoId: string): Promise<void> {
  const { data } = await supabase.from('videos_fichiers').select('chemin').eq('video_id', videoId)
  if (data?.length) await supabase.storage.from(BUCKET_VIDEOS).remove(data.map((f) => f.chemin))
}

/**
 * Efface les fichiers qui ne servent plus : 7 jours après la dernière activité s'ils ont été
 * publiés, 30 jours sinon. Un fichier attendu par un post programmé ou en cours d'envoi n'est
 * jamais effacé. Les brouillons en vidéo restés sans fichier repassent en « image ».
 */
export async function purgerFichiers(supabase: Client): Promise<{ effaces: number; abandonnes: number }> {
  const maintenant = Date.now()
  const { data: fichiers } = await supabase.from('videos_fichiers').select('*')
  let effaces = 0

  for (const fichier of fichiers ?? []) {
    const reseau = RESEAU_PAR_FORMAT[fichier.format as FormatFichier]
    const { data: posts } = await supabase
      .from('posts_reseaux')
      .select('statut, updated_at')
      .eq('video_id', fichier.video_id)
      .eq('reseau', reseau)
      .eq('media', 'video')
    if (posts?.some((p) => p.statut === 'programme' || p.statut === 'en_cours')) continue

    const derniereActivite = Math.max(new Date(fichier.created_at).getTime(), ...(posts ?? []).map((p) => new Date(p.updated_at).getTime()))
    const delai = posts?.some((p) => p.statut === 'envoye') ? DELAI_APRES_PUBLICATION : DELAI_JAMAIS_PUBLIE
    if (maintenant - derniereActivite < delai) continue

    const { error } = await supabase.storage.from(BUCKET_VIDEOS).remove([fichier.chemin])
    if (error) continue
    await supabase.from('videos_fichiers').delete().eq('id', fichier.id)
    await supabase
      .from('posts_reseaux')
      .update({ media: 'image' })
      .eq('video_id', fichier.video_id)
      .eq('reseau', reseau)
      .eq('media', 'video')
      .in('statut', ['brouillon', 'erreur'])
    effaces++
  }

  // Dépôts abandonnés : fichier arrivé au stockage mais jamais confirmé (onglet fermé avant la fin).
  const { data: connus } = await supabase.from('videos_fichiers').select('chemin')
  const chemins = new Set((connus ?? []).map((f) => f.chemin))
  const stockage = supabase.storage.from(BUCKET_VIDEOS)
  const abandonnes: string[] = []
  const { data: dossiers } = await stockage.list('', { limit: 1000 })
  for (const dossier of dossiers ?? []) {
    const { data: objets } = await stockage.list(dossier.name, { limit: 100 })
    for (const objet of objets ?? []) {
      if (!objet.id) continue // sous-dossier
      const chemin = `${dossier.name}/${objet.name}`
      const age = maintenant - new Date(objet.created_at).getTime()
      if (!chemins.has(chemin) && age > DELAI_DEPOT_ABANDONNE) abandonnes.push(chemin)
    }
  }
  if (abandonnes.length) await stockage.remove(abandonnes)

  return { effaces, abandonnes: abandonnes.length }
}
