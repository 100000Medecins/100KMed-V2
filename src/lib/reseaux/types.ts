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
