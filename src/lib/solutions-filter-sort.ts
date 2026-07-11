import { computeSortValue } from '@/lib/prix'

/**
 * Filtrage (par tags) + tri (note globale / par critère / prix / nom) des solutions d'une
 * catégorie — logique PURE, partagée entre le rendu serveur (fallback SEO de la page catégorie)
 * et le rendu client (`SolutionsCategoryBrowser`, qui lit `useSearchParams`).
 *
 * Portage fidèle de la logique qui était côté serveur dans la page catégorie (avant la passe 2
 * ISR). En la déportant côté client, la page redevient statique/ISR (elle ne lit plus
 * `searchParams` côté serveur → plus de rendu dynamique à chaque requête).
 */

export interface CategoryBrowseParams {
  selectedTagIds: string[]
  tri: string
  critereId: string
  dir: 'asc' | 'desc'
}

export interface CategoryBrowseData {
  notesRedac: Record<string, number>
  notesUtilisateurs: Record<string, number>
  nbNotesMap: Record<string, number>
  /** solutionId -> liste des id_tag (filtrage par tags) */
  solutionTags: Record<string, string[]>
  /** solutionId -> critereId -> { redac, users } (tri par critère) */
  critereNotes: Record<string, Record<string, { redac: number | null; users: number | null }>>
  displayPrixFront: boolean
}

export const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
  nom: 'asc',
  note_redac: 'desc',
  note_utilisateurs: 'desc',
  prix: 'asc',
}

/** Direction effective : valeur explicite de l'URL, sinon défaut du critère de tri. */
export function resolveDir(tri: string, dirParam?: string | null): 'asc' | 'desc' {
  if (dirParam === 'asc' || dirParam === 'desc') return dirParam
  return DEFAULT_DIR[tri] ?? 'desc'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterAndSortSolutions(solutions: any[], params: CategoryBrowseParams, data: CategoryBrowseData): any[] {
  const { selectedTagIds, tri, critereId, dir } = params
  const { notesRedac, notesUtilisateurs, nbNotesMap, solutionTags, critereNotes, displayPrixFront } = data

  // Filtre tags — comportement ET : garder les solutions qui portent TOUS les tags sélectionnés
  // (identique à getSolutionsByTags côté serveur).
  const filtered = selectedTagIds.length === 0
    ? solutions
    : solutions.filter((s) => {
        const t = solutionTags[s.id] || []
        return selectedTagIds.every((id) => t.includes(id))
      })

  const needsCritere = (tri === 'note_redac' || tri === 'note_utilisateurs') && !!critereId
  const source: 'redac' | 'utilisateurs' = tri === 'note_utilisateurs' ? 'utilisateurs' : 'redac'

  // Résolution note par critère — identique à getNotesCritere (fallback croisé redac/utilisateurs).
  const critereNoteFor = (sid: string): number | null => {
    const entry = critereNotes[sid]?.[critereId]
    if (!entry) return null
    const note = source === 'utilisateurs' ? (entry.users ?? entry.redac) : (entry.redac ?? entry.users)
    return note ?? null
  }

  let enriched = filtered.map((s) => ({
    ...s,
    noteRedacBase5: notesRedac[s.id] ?? null,
    noteUtilisateursBase5: notesUtilisateurs[s.id] ?? null,
    noteCritere: needsCritere ? critereNoteFor(s.id) : null,
    nbNotesUtilisateurs: nbNotesMap[s.id] ?? null,
  }))

  const asc = dir === 'asc'
  if (needsCritere) {
    enriched = enriched.sort((a, b) => asc ? (a.noteCritere ?? -1) - (b.noteCritere ?? -1) : (b.noteCritere ?? -1) - (a.noteCritere ?? -1))
  } else if (tri === 'note_redac') {
    enriched = enriched.sort((a, b) => asc ? (a.noteRedacBase5 ?? -1) - (b.noteRedacBase5 ?? -1) : (b.noteRedacBase5 ?? -1) - (a.noteRedacBase5 ?? -1))
  } else if (tri === 'note_utilisateurs') {
    enriched = enriched.sort((a, b) => asc ? (a.noteUtilisateursBase5 ?? -1) - (b.noteUtilisateursBase5 ?? -1) : (b.noteUtilisateursBase5 ?? -1) - (a.noteUtilisateursBase5 ?? -1))
  } else if (tri === 'prix' && displayPrixFront) {
    // Tri par prix : solutions sans prix renvoyées en fin de liste (triées par nom pour un ordre stable).
    const sortValueOf = (s: { prix_ttc: number | null; prix_ttc_min: number | null; prix_ttc_max: number | null }) =>
      computeSortValue({ ...s, prix_devise: null, prix_frequence: null, prix_duree_engagement_mois: null })
    const withPrix = enriched.filter((s) => sortValueOf(s) != null)
    const withoutPrix = enriched.filter((s) => sortValueOf(s) == null)
    withPrix.sort((a, b) => { const va = sortValueOf(a)!; const vb = sortValueOf(b)!; return asc ? va - vb : vb - va })
    withoutPrix.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
    enriched = [...withPrix, ...withoutPrix]
  } else {
    enriched = enriched.sort((a, b) => asc ? (a.nom || '').localeCompare(b.nom || '') : (b.nom || '').localeCompare(a.nom || ''))
  }

  return enriched
}
