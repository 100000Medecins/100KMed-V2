/**
 * Types applicatifs dérivés du schéma Supabase.
 * Basés sur les interfaces backend (Backend-main/functions/src/models.ts)
 * et adaptés au nouveau schéma PostgreSQL.
 */

import type { Database, Json } from './database'

// ============================================
// Row types directs depuis la DB
// ============================================
export type Editeur = Database['public']['Tables']['editeurs']['Row']
export type Categorie = Database['public']['Tables']['categories']['Row']
export type Solution = Database['public']['Tables']['solutions']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type Critere = Database['public']['Tables']['criteres']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Preference = Database['public']['Tables']['preferences']['Row']
export type Evaluation = Database['public']['Tables']['evaluations']['Row']
export type Resultat = Database['public']['Tables']['resultats']['Row']
export type SolutionUtilisee = Database['public']['Tables']['solutions_utilisees']['Row']
export type SolutionFavorite = Database['public']['Tables']['solutions_favorites']['Row']
export type Avatar = Database['public']['Tables']['avatars']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Actualite = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentRow = any
export type GalerieItem = Database['public']['Tables']['solutions_galerie']['Row']
export type PageStatique = Database['public']['Tables']['pages_statiques']['Row']

// ============================================
// Types composites (avec JOINs)
// ============================================

/** Solution avec éditeur, catégorie, tags et galerie */
export interface SolutionWithRelations extends Solution {
  editeur: Editeur | null
  categorie: Categorie | null
  tags: Array<{ tag: Tag }>
  galerie: GalerieItem[]
}

/** Solution avec résultat agrégé (pour les listes) */
export interface SolutionWithResultat extends Solution {
  editeur: Editeur | null
  resultat: Resultat | null
}

/** Résultat avec le critère associé */
export interface ResultatWithCritere extends Resultat {
  critere: Critere | null
}

/** Solution utilisée avec les détails de la solution */
export interface SolutionUtiliseeWithSolution extends SolutionUtilisee {
  solution: Solution | null
}

/** Solution favorite avec les détails de la solution */
export interface SolutionFavoriteWithSolution extends SolutionFavorite {
  solution: Solution | null
}

/** Critère avec ses sous-critères (hiérarchie) */
export interface CritereWithChildren extends Critere {
  children: CritereWithChildren[]
}

// ============================================
// Types pour les structures JSONB
// ============================================

/** Structure du schéma d'évaluation (stocké dans categories.schema_evaluation) */
export interface SchemaEvaluation {
  general: {
    titre: string
    information: string
    listeCriteres: Array<Record<string, boolean | Record<string, boolean>[]>>
  }
  detail: {
    steps: Array<{
      titre: string
      question: string
      information?: string
      listeCriteres: Array<Record<string, boolean | Record<string, boolean>[]>>
    }>
  }
  synthese: {
    titre: string
    information?: string
    listeCriteres: Array<Record<string, boolean | Record<string, boolean>[]>>
  }
}

/** Structure de la réponse d'un critère (stocké dans criteres.reponse) */
export interface CritereReponse {
  type: string
  min?: number
  max?: number
  choix?: string[]
  score?: string
}

/** Structure des scores d'évaluation (stocké dans evaluations.scores) */
export type EvaluationScores = Record<string, string | number | null>

/** Structure des notes par utilisateur (stocké dans resultats.notes) */
export type NotesParUtilisateur = Record<string, number>

/** Structure du prix (stocké dans solutions.prix) */
export interface Prix {
  prix_ttc: number
  devise: string
  frequence: string
  duree_engagement_mois: number
  created: string
}

/** Structure de la répartition HSL (stocké dans solutions) */
export interface ColorHSL {
  h: number
  s: number
  l: number
}

// ============================================
// Types pour les avis utilisateurs (paginés)
// ============================================

export interface AvisUtilisateur {
  idEvaluation: string
  idUser: string
  user?: Pick<User, 'pseudo' | 'portrait' | 'specialite' | 'mode_exercice'>
  avisGeneral?: Array<{ nomCourt: string; note: number }>
  avisSynthese?: {
    commentaire: string
    nps: number
  }
  lastDateNote: string | null
}

export interface AvisUtilisateursResult {
  avis: AvisUtilisateur[]
  idLastEvaluationRead?: string
  idFirstEvaluationRead?: string
}

// ============================================
// Types pour la comparaison
// ============================================

export interface ComparaisonSolution {
  noteRedac: number | null
  noteRedacBase5: number | null
  moyenneUtilisateurs: number | null
  moyenneUtilisateursBase5: number | null
  nbNotes: number
  comparaisonsCriteres: ComparaisonCriteres[]
}

export interface ComparaisonCriteres {
  titre: string
  criteres: ComparaisonCritere[]
}

export interface ComparaisonCritere {
  nomCourt?: string
  noteRedac?: number | null
  noteRedacBase5?: number | null
  moyenneUtilisateurs?: number | null
  moyenneUtilisateursBase5?: number | null
  nbNotes?: number
  isActif?: boolean
  criteres?: ComparaisonCritere[]
}

// ============================================
// Types utilitaires
// ============================================

/** Statuts possibles pour une évaluation */
export type StatutEvaluation = 'instanciee' | 'aCompleter' | 'finalisee' | 'ancienne'

/** Rôles utilisateur */
export type UserRole = 'medecin' | 'admin' | 'editeur'

/** Helper pour extraire le type Json en type typé */
export function asTyped<T>(json: Json | null): T | null {
  return json as T | null
}
