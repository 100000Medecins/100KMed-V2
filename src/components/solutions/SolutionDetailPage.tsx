import SolutionHero from './detail/SolutionHero'
import EditorialReview from './detail/EditorialReview'
import SolutionGallery from './detail/SolutionGallery'
import DetailedRatings from './detail/DetailedRatings'
import MainFeatures from './detail/MainFeatures'
import CategoryLink from './detail/CategoryLink'
import UserReviewsSection from './detail/UserReviewsSection'
import ConfrereTestimonials from './detail/ConfrereTestimonials'
import ComparisonSection from './detail/ComparisonSection'
import PublisherWord from './detail/PublisherWord'
import type { SolutionWithRelations, ResultatWithCritere } from '@/types/models'
import type { NoteRedac } from '@/lib/db/solutions'

const SVG_GRADIENT_BG = `url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMzg0MCIgaGVpZ2h0PSIyMTYwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImIiIGN4PSIxMDAlIiBjeT0iMTAwJSIgcj0iMTAwJSIgZng9IjEwMCUiIGZ5PSIxMDAlIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAgLTEgLjU2MjUgMCAuNDM4IDIpIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMkM3QjhDIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNUNBQ0E5IiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iYyIgY3g9IjAlIiBjeT0iMCUiIHI9IjEwMi4yNDklIiBmeD0iMCUiIGZ5PSIwJSIgZ3JhZGllbnRUcmFuc2Zvcm09InNjYWxlKC41NjI1IDEuMDEwMjYpIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzk3NEI3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMzk3NEI3IiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iZCIgY3g9IjAlIiBjeT0iMTAwJSIgcj0iMTAwJSIgZng9IjAlIiBmeT0iMTAwJSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwIC0xIC41NjI1IDAgLS41NjMgMSkiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGMUI5ODYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGMUI5ODYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJlIiBjeD0iNDEuNjU1JSIgY3k9IjU3LjQ3NCUiIHI9IjUxLjc3MSUiIGZ4PSI0MS42NTUlIiBmeT0iNTcuNDc0JSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwIDEgLS44MDE3OSAwIC44NzcgLjE1OCkiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNFRjkxQTEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNFRjkxQTEiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggaWQ9ImEiIGQ9Ik0wIDBoMzg0MHYyMTYwSDB6Ii8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDE5MjAgMTA4MCkiPjx1c2UgeGxpbms6aHJlZj0iI2EiIGZpbGw9InVybCgjYikiLz48dXNlIHhsaW5rOmhyZWY9IiNhIiBmaWxsPSJ1cmwoI2MpIi8+PHVzZSB4bGluazpocmVmPSIjYSIgZmlsbD0idXJsKCNkKSIvPjx1c2UgeGxpbms6aHJlZj0iI2EiIGZpbGw9InVybCgjZSkiLz48L2c+PC9zdmc+) center/cover no-repeat`

interface AvisPagine {
  id: string
  userId: string
  user: { pseudo: string | null; portrait: string | null; specialite: string | null; mode_exercice: string | null } | null
  moyenne: number | null
  date: string | null
  commentaire: string | null
  dureeMois: number | null
  ancienUtilisateur?: boolean
  scores: Record<string, number | null>
}

interface SolutionDetailPageProps {
  solution: SolutionWithRelations
  resultats: ResultatWithCritere[]
  notesRedac: NoteRedac[]
  noteUtilisateursData?: { note: number | null; total: number; distribution: Record<string, number> }
  avisPagines?: {
    avis: AvisPagine[]
    total: number
    page: number
    totalPages: number
  }
  autreSolutions?: { id: string; nom: string; logo_url: string | null }[]
}

export default function SolutionDetailPage({
  solution,
  resultats,
  notesRedac,
  noteUtilisateursData,
  avisPagines,
  autreSolutions,
}: SolutionDetailPageProps) {
  const categorieSlug = solution.categorie?.slug || ''
  // Ne garder que les critères avec un nom_capital non null
  const filteredResultats = resultats.filter(
    (r) => r.critere?.nom_capital != null
  )
  // Note utilisateurs calculée dynamiquement depuis les scores (gère l'échelle 0-10 et 0-5)
  const noteUtilisateurs = noteUtilisateursData?.note ?? null
  const nbEvaluations = noteUtilisateursData?.total ?? 0
  const noteRedaction = (solution as unknown as Record<string, unknown>).evaluation_redac_note != null
    ? Number((solution as unknown as Record<string, unknown>).evaluation_redac_note)
    : null

  return (
    <section style={{ background: SVG_GRADIENT_BG }}>
      {/* Hero — fond navy propre */}
      <SolutionHero
        solution={solution}
        noteRedaction={noteRedaction}
        noteUtilisateurs={noteUtilisateurs}
        nbEvaluations={nbEvaluations}
        categorieSlug={categorieSlug}
        hasDetailedRatings={notesRedac.length > 0}
      />

      {/* Contenu — background gradient SVG */}
      <div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* 2 colonnes : contenu principal + sidebar */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-8">
            {/* Colonne gauche */}
            <div className="space-y-8">
              <div id="avis-redaction">
                <EditorialReview
                  avisRedaction={solution.evaluation_redac_avis}
                  noteRedaction={noteRedaction}
                  pointsForts={solution.evaluation_redac_points_forts}
                  pointsFaibles={solution.evaluation_redac_points_faibles}
                />
              </div>

              <div id="galerie">
                <SolutionGallery images={solution.galerie || []} />
              </div>

              <div id="notes-detaillees">
                <DetailedRatings notesRedac={notesRedac} />
              </div>

              <div id="avis-utilisateurs">
                <UserReviewsSection
                  resultats={filteredResultats}
                  noteUtilisateursData={noteUtilisateursData}
                />
              </div>

              {avisPagines && avisPagines.total > 0 && (
                <div id="temoignages">
                  <ConfrereTestimonials
                    solutionId={solution.id}
                    totalEvaluations={nbEvaluations}
                    initialAvis={avisPagines.avis}
                    initialTotal={avisPagines.total}
                    initialTotalPages={avisPagines.totalPages}
                    categorieSlug={categorieSlug}
                  />
                </div>
              )}

              <div id="comparaison">
                <ComparisonSection
                  solutionNom={solution.nom}
                  resultats={filteredResultats}
                  autreSolutions={autreSolutions || []}
                />
              </div>

              <div id="mot-editeur">
                <PublisherWord
                  motEditeur={solution.mot_editeur}
                  editeur={solution.editeur}
                />
              </div>
            </div>

            {/* Colonne droite (sidebar) */}
            <div className="space-y-6">
              <MainFeatures tags={solution.tags || []} />
              <CategoryLink categorie={solution.categorie} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
