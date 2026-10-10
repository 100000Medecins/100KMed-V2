'use server'

/**
 * Fichiers vidéo du panneau « Publier sur les réseaux » : le navigateur dépose le fichier
 * directement dans le bucket privé (une action serveur ne reçoit que quelques Mo), avec une
 * adresse de dépôt signée délivrée ici après contrôle de la session admin.
 * Chaque action renvoie les fichiers et les posts à jour de la vidéo.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { assertAdminOuContenu, roleAdmin } from '@/lib/auth/admin-guard'
import { listerPosts } from '@/lib/reseaux/envoi'
import { BUCKET_VIDEOS, listerFichiers } from '@/lib/reseaux/fichiers'
import { FORMATS, POIDS_MAX, RESEAU_PAR_FORMAT, TYPES_VIDEO, type FichierVideo, type FormatFichier, type PostReseau } from '@/lib/reseaux/types'

type Resultat = { fichiers: FichierVideo[]; posts: PostReseau[]; error?: string }

async function etat(videoId: string, error?: string): Promise<Resultat> {
  return { fichiers: await listerFichiers(videoId), posts: await listerPosts({ type: 'video', id: videoId }), error }
}

function poidsLisible(octets: number): string {
  return `${Math.round(octets / (1024 * 1024))} Mo`
}

/** Délivre une adresse de dépôt signée (valable 2 h, un seul fichier) pour le chemin choisi ici. */
export async function preparerDepot(
  videoId: string,
  format: FormatFichier,
  fichier: { taille: number; type: string },
): Promise<{ adresse: string; chemin: string } | { error: string }> {
  await assertAdminOuContenu()
  if (!FORMATS.includes(format)) return { error: 'Emplacement inconnu.' }
  if (!TYPES_VIDEO.includes(fichier.type)) return { error: 'Format non accepté : déposez un fichier MP4 ou MOV.' }
  if (fichier.taille > POIDS_MAX[format]) return { error: `Fichier trop lourd : ${poidsLisible(POIDS_MAX[format])} au plus pour le ${format}.` }

  const supabase = createServiceRoleClient()
  const { data: video } = await supabase.from('videos').select('id').eq('id', videoId).maybeSingle()
  if (!video) return { error: 'Vidéo introuvable.' }

  // Chemin unique par dépôt : un fichier remplacé ne réutilise jamais l'adresse du précédent.
  const chemin = `${video.id}/${format}-${Date.now()}.${fichier.type === 'video/mp4' ? 'mp4' : 'mov'}`
  const { data, error } = await supabase.storage.from(BUCKET_VIDEOS).createSignedUploadUrl(chemin)
  return data ? { adresse: data.signedUrl, chemin } : { error: `Dépôt impossible : ${error.message}` }
}

/** Enregistre un fichier arrivé au stockage : poids et type relus côté stockage, pas ceux annoncés. */
export async function confirmerDepot(videoId: string, format: FormatFichier, chemin: string, nom: string): Promise<Resultat> {
  await assertAdminOuContenu()
  if (!FORMATS.includes(format) || !chemin.startsWith(`${videoId}/${format}-`)) return etat(videoId, 'Dépôt non reconnu.')

  const supabase = createServiceRoleClient()
  const stockage = supabase.storage.from(BUCKET_VIDEOS)
  const { data: info } = await stockage.info(chemin)
  if (!info?.size) return etat(videoId, "Le fichier n'est pas arrivé : recommencez le dépôt.")
  if (info.size > POIDS_MAX[format]) {
    await stockage.remove([chemin])
    return etat(videoId, `Fichier trop lourd : ${poidsLisible(POIDS_MAX[format])} au plus pour le ${format}.`)
  }

  const { data: ancien } = await supabase.from('videos_fichiers').select('chemin').eq('video_id', videoId).eq('format', format).maybeSingle()
  const maintenant = new Date().toISOString()
  const { error } = await supabase.from('videos_fichiers').upsert(
    {
      video_id: videoId,
      format,
      chemin,
      nom_origine: nom.slice(0, 200),
      taille: info.size,
      type_mime: info.contentType ?? 'video/mp4',
      depose_par: await roleAdmin(),
      created_at: maintenant,
    },
    { onConflict: 'video_id,format' },
  )
  if (error) {
    await stockage.remove([chemin])
    return etat(videoId, `Enregistrement impossible : ${error.message}`)
  }
  if (ancien && ancien.chemin !== chemin) await stockage.remove([ancien.chemin])

  // Un fichier déposé est là pour être publié : le brouillon du réseau concerné passe en vidéo.
  await supabase
    .from('posts_reseaux')
    .update({ media: 'video', updated_at: maintenant })
    .eq('video_id', videoId)
    .eq('reseau', RESEAU_PAR_FORMAT[format])
    .eq('statut', 'brouillon')
  return etat(videoId)
}

/** Efface un fichier (refusé si un post programmé l'attend) ; les brouillons en vidéo repassent en « image ». */
export async function supprimerFichier(videoId: string, format: FormatFichier): Promise<Resultat> {
  await assertAdminOuContenu()
  if (!FORMATS.includes(format)) return etat(videoId, 'Emplacement inconnu.')

  const supabase = createServiceRoleClient()
  const { data: fichier } = await supabase.from('videos_fichiers').select('*').eq('video_id', videoId).eq('format', format).maybeSingle()
  if (!fichier) return etat(videoId)

  const reseau = RESEAU_PAR_FORMAT[format]
  const { data: attendu } = await supabase
    .from('posts_reseaux')
    .select('id')
    .eq('video_id', videoId)
    .eq('reseau', reseau)
    .eq('media', 'video')
    .in('statut', ['programme', 'en_cours'])
    .limit(1)
  if (attendu?.length) return etat(videoId, "Un post programmé doit publier ce fichier : annulez d'abord sa programmation.")

  const { error } = await supabase.storage.from(BUCKET_VIDEOS).remove([fichier.chemin])
  if (error) return etat(videoId, `Suppression impossible : ${error.message}`)
  await supabase.from('videos_fichiers').delete().eq('id', fichier.id)
  await supabase
    .from('posts_reseaux')
    .update({ media: 'image', updated_at: new Date().toISOString() })
    .eq('video_id', videoId)
    .eq('reseau', reseau)
    .eq('media', 'video')
    .in('statut', ['brouillon', 'erreur'])
  return etat(videoId)
}
