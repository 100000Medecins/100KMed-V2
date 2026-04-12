'use server'

import { getAllResultats } from '@/lib/db/resultats'
import { computeAggregatedResultats } from '@/lib/db/evaluations'

interface ComparisonDataItem {
  nomCourt: string
  type: string
  valueRedac: number | null
  valueUtilisateurs: number | null
}

export interface SubCritereItem {
  critereId: string
  identifiantTech?: string
  parentId: string | null
  isParent?: boolean
  nomCourt: string
  valueRedac: number | null
  valueUtilisateurs: number | null
  nbNotes: number | null
}

/**
 * Récupère les données radar d'une solution pour la comparaison.
 * Retourne les deux sources de notes séparément pour permettre le toggle.
 */
export async function getComparisonData(solutionId: string): Promise<ComparisonDataItem[]> {
  let resultats = await getAllResultats(solutionId)

  if (resultats.length === 0) {
    resultats = await computeAggregatedResultats(solutionId)
  }

  return resultats
    .filter((r) => r.critere && r.critere.type !== 'synthese' && r.critere.type !== 'nps')
    .map((r) => ({
      nomCourt: r.critere?.nom_court || '',
      type: r.critere?.type || '',
      valueRedac: r.note_redac_base5 != null ? Number(r.note_redac_base5) : null,
      valueUtilisateurs: r.moyenne_utilisateurs_base5 != null ? Number(r.moyenne_utilisateurs_base5) : null,
    }))
}

/**
 * Récupère tous les sous-critères d'une solution pour le comparatif détaillé.
 * Retourne tous les résultats avec leur identifiant_tech pour le matching par schema_evaluation.
 */
export async function getDetailedComparisonData(solutionId: string): Promise<SubCritereItem[]> {
  const resultats = await getAllResultats(solutionId)
  return resultats
    .filter((r) => r.critere?.type !== 'synthese' && r.critere?.type !== 'nps' && r.critere?.identifiant_bis)
    .map((r) => ({
      critereId: r.critere_id ?? '',
      identifiantTech: r.critere?.identifiant_bis ?? '', // Firebase ID, utilisé pour matcher le schema_evaluation
      parentId: r.critere?.parent_id ?? null,
      isParent: r.critere?.is_parent === true,
      nomCourt: r.critere?.nom_court ?? '',
      valueRedac: r.note_redac_base5 != null ? Number(r.note_redac_base5) : null,
      valueUtilisateurs: r.moyenne_utilisateurs_base5 != null ? Number(r.moyenne_utilisateurs_base5) : null,
      nbNotes: r.nb_notes != null ? Number(r.nb_notes) : null,
    }))
}
