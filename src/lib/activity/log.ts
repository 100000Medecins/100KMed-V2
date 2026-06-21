import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

/**
 * Journal d'activité admin (`public.activity_log`).
 *
 * Flux d'ÉVÉNEMENTS de supervision (1 ligne = 1 événement), distinct de
 * `editeurs_edit_log` qui garde le détail champ par champ des modifs éditeur.
 * Périmètre : événements « sensibles » uniquement (création / modification /
 * suppression de donnée métier, ou événement attendant une action admin).
 * Pas de bruit analytique (lectures, navigation, brouillons intermédiaires).
 *
 * Règle d'or : logguer ne doit JAMAIS faire échouer l'action métier appelante.
 * Toute erreur d'insertion est avalée (try/catch + console.error).
 */

/** Catalogue des types d'événements tracés. Sert de référence partagée. */
export const ACTIVITY_TYPES = {
  INSCRIPTION_EMAIL: 'inscription_email',
  INSCRIPTION_PSC: 'inscription_psc',
  EVALUATION_PUBLIEE: 'evaluation_publiee',
  EVALUATION_EN_ATTENTE_PSC: 'evaluation_en_attente_psc',
  EVALUATION_A_COMPLETER: 'evaluation_a_completer',
  EDITEUR_MODIF_FICHE: 'editeur_modif_fiche',
  EDITEUR_MODIF_SOLUTION: 'editeur_modif_solution',
  PROPOSITION: 'proposition',
  REVENDICATION: 'revendication',
  DEMANDE_REFERENCEMENT: 'demande_referencement',
  ADMIN_SUPPRESSION: 'admin_suppression',
  ADMIN_PARAMETRE: 'admin_parametre',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

export type ActeurType = 'medecin' | 'editeur' | 'admin' | 'systeme'
export type Gravite = 'info' | 'a_moderer'

/** Diff champ par champ pour les événements de modification. */
export type ActivityDiff = Record<string, { avant: unknown; apres: unknown }>

export interface ActivityInput {
  type: ActivityType
  acteurType?: ActeurType
  /** users.id si applicable (null pour admin / système). */
  acteurId?: string | null
  /** Libellé dénormalisé (nom de l'acteur) — survit à la suppression du compte. */
  acteurLabel?: string | null
  /** editeur | solution | evaluation | user | proposition … */
  cibleType?: string | null
  /** TEXT : les ids editeurs/solutions sont des ids Firebase (pas des uuid). */
  cibleId?: string | null
  cibleLabel?: string | null
  diff?: ActivityDiff | null
  gravite?: Gravite
}

/**
 * Enregistre un événement dans `activity_log`. Ne lève jamais : en cas d'échec,
 * l'erreur est logguée côté serveur et l'action métier appelante continue.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('activity_log').insert({
      type: input.type,
      acteur_type: input.acteurType ?? null,
      acteur_id: input.acteurId ?? null,
      acteur_label: input.acteurLabel ?? null,
      cible_type: input.cibleType ?? null,
      cible_id: input.cibleId ?? null,
      cible_label: input.cibleLabel ?? null,
      diff: (input.diff ?? null) as Json,
      gravite: input.gravite ?? 'info',
    })
  } catch (e) {
    console.error('[activity_log] insertion échouée (ignorée):', e)
  }
}
