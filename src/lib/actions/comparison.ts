'use server'

import { getAllResultats } from '@/lib/db/resultats'
import { computeAggregatedResultats } from '@/lib/db/evaluations'

interface ComparisonDataItem {
  nomCourt: string
  type: string
  value: number
}

/**
 * Récupère les données radar d'une solution pour la comparaison.
 * Utilise le même fallback que la page principale :
 * 1. Table `resultats`
 * 2. Si vide, calcul agrégé depuis `evaluations`
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
      value: Number(r.note_redac_base5 ?? r.moyenne_utilisateurs_base5 ?? 0),
    }))
}
