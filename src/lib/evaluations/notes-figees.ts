/**
 * Notes figées de l'ancien site (Firebase) et anciens avis re-notés sur le nouveau site.
 *
 * Pour une solution `is_firebase_legacy`, chaque critère porte une note figée
 * (`resultats.firebase_moyenne_base5` × `firebase_nb_notes`) calculée par l'ancien site.
 * Elle n'est pas la somme des avis importés (l'ancien site avait son propre calcul) : on ne
 * peut pas la recalculer, seulement y remplacer la note d'un médecin qui re-note.
 *
 * `evaluations_notes_figees` garde, pour chaque avis de l'ancien site, la note qui compte
 * dans la note figée (remplie le 2026-11-12). Quand le médecin re-note, sa nouvelle note la
 * remplace, critère par critère : même poids que les autres votants. Un critère laissé vide
 * garde l'ancienne note ; une simple confirmation (« toujours d'actualité ») ne change rien.
 * Avant le 2026-11-12, la re-notation d'un ancien avis ne comptait nulle part.
 *
 * Module sans `'use server'` (fonctions synchrones) ; imports relatifs (utilisable par un script).
 */

import type { Json } from '../../types/database'

/** Mise en ligne du nouveau site : les avis créés avant sont ceux de l'ancien site. */
export const DATE_MISE_EN_LIGNE = '2026-04-12T00:00:00Z'

export type AvisAncienSite = {
  scores: Json
  moyenne_utilisateur: number | null
  /** Note figée de l'avis (`evaluations_notes_figees`) ; absente : l'avis ne change rien. */
  figee: { scores: Json; moyenne: number | null } | null
}

/** Note > 0 (« 0 = non noté », règle du 2026-07-14), sinon null. */
function note(valeur: unknown): number | null {
  const n = typeof valeur === 'number' ? valeur : typeof valeur === 'string' ? parseFloat(valeur) : NaN
  return Number.isNaN(n) || n <= 0 ? null : n
}

function lire(scores: Json, cle: string): unknown {
  return scores && typeof scores === 'object' && !Array.isArray(scores) ? scores[cle] : undefined
}

/**
 * Écart à ajouter au calcul d'un critère (`cle` = identifiant_tech) ou de la note globale
 * (`cle` = null, lit les moyennes) pour les anciens avis re-notés.
 *
 * `ancre` : le critère a une note figée valable. Sans elle, l'ancienne note ne comptait
 * nulle part : une nouvelle note différente s'ajoute simplement.
 */
export function ecartAvisRenotes(
  avis: AvisAncienSite[],
  cle: string | null,
  ancre: boolean
): { somme: number; nombre: number } {
  let somme = 0
  let nombre = 0
  for (const a of avis) {
    if (!a.figee) continue
    const nouvelle = note(cle == null ? a.moyenne_utilisateur : lire(a.scores, cle))
    if (nouvelle == null) continue
    const ancienne = note(cle == null ? a.figee.moyenne : lire(a.figee.scores, cle))
    // Note inchangée : rien à faire, même sans note figée valable (sinon un critère « non
    // noté » de l'ancien site se remplirait des notes importées, sans aucune re-notation).
    if (ancienne != null && Math.abs(nouvelle - ancienne) < 1e-9) continue
    if (ancre && ancienne != null) {
      somme += nouvelle - ancienne
    } else {
      somme += nouvelle
      nombre += 1
    }
  }
  return { somme, nombre }
}
