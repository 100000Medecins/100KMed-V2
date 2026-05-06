'use server'

import { getAllResultats } from '@/lib/db/resultats'
import { computeAggregatedResultats } from '@/lib/db/evaluations'

interface ComparisonDataItem {
  nomCourt: string
  type: string
  valueRedac: number | null
  valueUtilisateurs: number | null
}

export interface DetailGroupItem {
  parentKey: string
  parentNom: string
  items: {
    critereId: string
    nomCourt: string
    valueUtilisateurs: number | null
  }[]
}

const GROUP_NAMES: Record<string, string> = {
  interface: 'Interface utilisateur',
  fonctionnalites: 'Fonctionnalités',
  fiabilite: 'Fiabilité',
  editeur: 'Éditeur',
  qualite_prix: 'Rapport qualité/prix',
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
 * Récupère les notes utilisateurs par sous-critère (detail_*), groupées par critère principal.
 * Utilisé pour l'accordéon "Comparatif détaillé" dans ComparisonSection.
 */
export async function getDetailedComparisonData(solutionId: string): Promise<DetailGroupItem[]> {
  const resultats = await getAllResultats(solutionId)

  // Construire un index critere.id → identifiant_tech depuis les critères principaux (toutes catégories)
  const parentIdentMap = new Map<string, string>()
  for (const r of resultats) {
    if (r.critere?.is_enfant !== true && r.critere?.identifiant_tech && r.critere?.id) {
      parentIdentMap.set(r.critere.id, r.critere.identifiant_tech)
    }
  }

  // Garder uniquement les sous-critères (is_enfant = true)
  const subResultats = resultats.filter((r) => r.critere?.is_enfant === true)

  if (subResultats.length === 0) return []

  // Grouper par critère principal via parent_id → identifiant_tech (résolu depuis la DB)
  const grouped = new Map<string, DetailGroupItem>()

  for (const r of subResultats) {
    const parentId = r.critere?.parent_id
    if (!parentId) continue

    const parentKey = parentIdentMap.get(parentId)
    if (!parentKey) continue

    if (!grouped.has(parentKey)) {
      grouped.set(parentKey, {
        parentKey,
        parentNom: GROUP_NAMES[parentKey] || parentKey,
        items: [],
      })
    }

    grouped.get(parentKey)!.items.push({
      critereId: r.critere?.id ?? r.critere?.identifiant_tech ?? '',
      nomCourt: r.critere?.nom_court || r.critere?.identifiant_tech || '',
      valueUtilisateurs: r.moyenne_utilisateurs_base5 != null ? Number(r.moyenne_utilisateurs_base5) : null,
    })
  }

  // Retourner dans l'ordre des groupes
  return ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']
    .map((key) => grouped.get(key))
    .filter((g): g is DetailGroupItem => g != null)
}

