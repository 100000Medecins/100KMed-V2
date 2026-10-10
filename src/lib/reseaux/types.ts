/**
 * Posts réseaux sociaux préparés depuis l'admin (table `posts_reseaux`).
 * Types partagés serveur / panneau client : pas de dépendance serveur ici.
 */
import type { Database } from '@/types/database'

export type Reseau = 'linkedin' | 'facebook' | 'instagram'
export const RESEAUX: Reseau[] = ['linkedin', 'facebook', 'instagram']

/**
 * brouillon → (envoi immédiat) en_cours → envoye | erreur
 * brouillon → (programmation) programme → (tâche planifiée) en_cours → envoye | erreur
 * « envoye » = transmis à Make : la publication elle-même se lit dans l'historique Make.
 */
export type StatutPost = 'brouillon' | 'programme' | 'en_cours' | 'envoye' | 'erreur'

export type PostReseau = Database['public']['Tables']['posts_reseaux']['Row']

/** Contenu auquel un post est rattaché. */
export type SourcePost = { type: 'article' | 'video'; id: string }

/** « image » : lien + image (tous les réseaux). « video » : le fichier vidéo lui-même. */
export type MediaPost = 'image' | 'video'

/**
 * Fichiers vidéo déposés pour la publication native (table `videos_fichiers`, bucket privé
 * `videos-reseaux`) : un vertical et un horizontal par vidéo, effacés après publication.
 */
export type FormatFichier = 'vertical' | 'horizontal'
export const FORMATS: FormatFichier[] = ['vertical', 'horizontal']

export type FichierVideo = Database['public']['Tables']['videos_fichiers']['Row']

/** Réseau qui publie chaque fichier. LinkedIn n'en publie pas : il garde le lien YouTube. */
export const RESEAU_PAR_FORMAT: Record<FormatFichier, Reseau> = { vertical: 'instagram', horizontal: 'facebook' }

/** Fichier attendu par un réseau pour un post en vidéo, ou null s'il n'en publie pas. */
export function formatDuReseau(reseau: string): FormatFichier | null {
  return FORMATS.find((f) => RESEAU_PAR_FORMAT[f] === reseau) ?? null
}

export const TYPES_VIDEO = ['video/mp4', 'video/quicktime']

const MO = 1024 * 1024
/** Poids maximal en octets : 300 Mo = plafond de Meta pour un Reel, 500 Mo = plafond du bucket. */
export const POIDS_MAX: Record<FormatFichier, number> = { vertical: 300 * MO, horizontal: 500 * MO }
