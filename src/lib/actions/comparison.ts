'use server'

import { getAllResultats } from '@/lib/db/resultats'
import { computeAggregatedResultats } from '@/lib/db/evaluations'

interface ComparisonDataItem {
  nomCourt: string
  type: string
  valueRedac: number | null
  valueUtilisateurs: number | null
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

