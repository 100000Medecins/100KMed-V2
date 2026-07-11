'use client'

import SolutionFilters from './SolutionFilters'
import SolutionSortBar from './SolutionSortBar'
import SolutionList from './SolutionList'
import type { Tag, Critere } from '@/types/models'

/**
 * Vue présentational (sans état) de la zone filtres + tri + liste de la page catégorie.
 * Utilisée à la fois :
 *  - côté serveur, comme fallback du <Suspense> (vue par défaut → HTML statique = SEO OK) ;
 *  - côté client, par SolutionsCategoryBrowser (avec les params de l'URL résolus).
 * `SolutionFilters` / `SolutionSortBar` restent inchangés (ils pilotent l'URL via router.push ;
 * sur une page statique, ça met à jour useSearchParams côté client sans re-render serveur).
 */
interface SolutionsCategoryViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enriched: any[]
  tags: Tag[]
  criteresMajeurs: Critere[]
  selectedTagIds: string[]
  tri: string
  critereId: string
  dir: 'asc' | 'desc'
  displayPrixFront: boolean
  categorieSlug: string
  hasNoteRedac: boolean
  labelFiltres?: string
}

export default function SolutionsCategoryView({
  enriched, tags, criteresMajeurs, selectedTagIds, tri, critereId, dir,
  displayPrixFront, categorieSlug, hasNoteRedac, labelFiltres,
}: SolutionsCategoryViewProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10 md:py-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filtres (tags uniquement) */}
        {tags.length > 0 && (
          <aside className="w-full md:w-52 shrink-0">
            <SolutionFilters
              tags={tags}
              selectedTagIds={selectedTagIds}
              currentTri={tri}
              currentCritere={critereId}
              currentDir={dir}
              labelFiltres={labelFiltres}
            />
          </aside>
        )}

        {/* Colonne solutions : bandeau de tri (sticky) + liste */}
        <div className="flex-1 min-w-0">
          <SolutionSortBar
            criteresMajeurs={criteresMajeurs}
            currentTri={tri}
            currentCritere={critereId}
            currentDir={dir}
            selectedTagIds={selectedTagIds}
            count={enriched.length}
            hideNoteRedac={!hasNoteRedac}
            showPrixOption={displayPrixFront}
          />
          <SolutionList solutions={enriched} categorieSlug={categorieSlug} tri={tri} displayPrixFront={displayPrixFront} />
        </div>
      </div>
    </section>
  )
}
