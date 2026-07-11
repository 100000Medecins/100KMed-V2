'use client'

import { useSearchParams } from 'next/navigation'
import SolutionsCategoryView from './SolutionsCategoryView'
import { filterAndSortSolutions, resolveDir, type CategoryBrowseData } from '@/lib/solutions-filter-sort'
import type { Tag, Critere } from '@/types/models'

/**
 * Pilote client de la page catégorie : lit les filtres/tri depuis `useSearchParams`, applique le
 * filtrage + tri en mémoire (fonction pure partagée), et rend la vue présentational.
 *
 * DOIT être monté sous un <Suspense> (exigence Next pour useSearchParams sur page statique). Le
 * fallback de ce Suspense = la vue par défaut rendue côté serveur → la liste des solutions est
 * dans le HTML statique (SEO), puis ce composant prend le relais avec les params réels au montage.
 */
interface SolutionsCategoryBrowserProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  solutions: any[]
  tags: Tag[]
  criteresMajeurs: Critere[]
  data: CategoryBrowseData
  categorieSlug: string
  hasNoteRedac: boolean
  labelFiltres?: string
}

export default function SolutionsCategoryBrowser({
  solutions, tags, criteresMajeurs, data, categorieSlug, hasNoteRedac, labelFiltres,
}: SolutionsCategoryBrowserProps) {
  const sp = useSearchParams()
  const selectedTagIds = sp.get('tags')?.split(',').filter(Boolean) || []
  const tri = sp.get('tri') || 'note_utilisateurs'
  const critereId = sp.get('critere') || ''
  const dir = resolveDir(tri, sp.get('dir'))

  const enriched = filterAndSortSolutions(solutions, { selectedTagIds, tri, critereId, dir }, data)

  return (
    <SolutionsCategoryView
      enriched={enriched}
      tags={tags}
      criteresMajeurs={criteresMajeurs}
      selectedTagIds={selectedTagIds}
      tri={tri}
      critereId={critereId}
      dir={dir}
      displayPrixFront={data.displayPrixFront}
      categorieSlug={categorieSlug}
      hasNoteRedac={hasNoteRedac}
      labelFiltres={labelFiltres}
    />
  )
}
