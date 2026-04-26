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
    <section>
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
              <div id="avis-redaction" className="scroll-mt-[140px]">
                <EditorialReview
                  avisRedaction={solution.evaluation_redac_avis}
                  noteRedaction={noteRedaction}
                  pointsForts={solution.evaluation_redac_points_forts}
                  pointsFaibles={solution.evaluation_redac_points_faibles}
                />
              </div>

              <div id="galerie" className="scroll-mt-[140px]">
                <SolutionGallery images={solution.galerie || []} />
              </div>

              <div id="notes-detaillees" className="scroll-mt-[140px]">
                <DetailedRatings notesRedac={notesRedac} />
              </div>

              <div id="avis-utilisateurs" className="scroll-mt-[140px]">
                <UserReviewsSection
                  resultats={filteredResultats}
                  noteUtilisateursData={noteUtilisateursData}
                />
              </div>

              <div id="comparaison" className="scroll-mt-[140px]">
                <ComparisonSection
                  solutionId={solution.id}
                  solutionNom={solution.nom}
                  resultats={filteredResultats}
                  autreSolutions={autreSolutions || []}
                />
              </div>

              {avisPagines && avisPagines.total > 0 && (
                <div id="temoignages" className="scroll-mt-[140px]">
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

              <div id="mot-editeur" className="scroll-mt-[140px]">
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
