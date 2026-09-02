import SolutionHero from './detail/SolutionHero'
import EditorialReview from './detail/EditorialReview'
import SolutionGallery from './detail/SolutionGallery'
import DetailedRatings from './detail/DetailedRatings'
import MainFeatures from './detail/MainFeatures'
import CategoryLink from './detail/CategoryLink'
import SolutionLiensCard from './detail/SolutionLiensCard'
import SolutionCommunautesCard from './detail/SolutionCommunautesCard'
import TarificationCard from './detail/TarificationCard'
import type { SolutionLienVoisin } from '@/lib/db/solution-liens'
import type { CommunautePublique } from '@/lib/db/solution-communautes'
import UserReviewsSection from './detail/UserReviewsSection'
import ConfrereTestimonials from './detail/ConfrereTestimonials'
import ComparisonSection from './detail/ComparisonSection'
import PublisherWord from './detail/PublisherWord'
import SupportSection from './detail/SupportSection'
import type { SolutionWithRelations, ResultatWithCritere } from '@/types/models'
import { firstContact } from '@/lib/contacts'
import type { NoteRedac } from '@/lib/db/solutions'
import type { NoteGlobaleTooltip as NoteGlobaleTooltipData } from '@/lib/db/tooltips'

interface AvisPagine {
  id: string
  userId: string
  user: { pseudo: string | null; nom: string | null; prenom: string | null; portrait: string | null; specialite: string | null; specialite_secondaire: string | null; mode_exercice: string | null; mode_exercice_secondaire: string | null } | null
  moyenne: number | null
  date: string | null
  commentaire: string | null
  duree: { annees: number; auMoins: boolean } | null
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
  solutionsLiees?: SolutionLienVoisin[]
  communautes?: CommunautePublique[]
  noteGlobaleTooltip?: NoteGlobaleTooltipData | null
  /** Toggle global app_settings.display_prix_front : si false, on n'affiche pas le bloc Tarification. */
  displayPrixFront?: boolean
  /** Toggle global app_settings.display_contacts_commerciaux : si false, on masque le sous-bloc commercial dans SupportSection. */
  displayContactsCommerciaux?: boolean
}

export default function SolutionDetailPage({
  solution,
  resultats,
  notesRedac,
  noteUtilisateursData,
  avisPagines,
  autreSolutions,
  solutionsLiees,
  communautes,
  noteGlobaleTooltip,
  displayPrixFront = false,
  displayContactsCommerciaux = false,
}: SolutionDetailPageProps) {
  const categorieSlug = solution.categorie?.slug || ''
  // Ne garder que les critères avec un nom_capital non null
  const filteredResultats = resultats.filter(
    (r) => r.critere?.nom_capital != null
  )
  // Le radar comparatif (ComparisonSection) n'est rendu qu'à partir de 3 critères → conditionne le bouton "Comparer" du hero.
  const hasComparaison = filteredResultats.length >= 3
  // Note utilisateurs calculée dynamiquement depuis les scores (gère l'échelle 0-10 et 0-5)
  const noteUtilisateurs = noteUtilisateursData?.note ?? null
  const nbEvaluations = noteUtilisateursData?.total ?? 0
  const noteRedaction = (solution as unknown as Record<string, unknown>).evaluation_redac_note != null
    ? Number((solution as unknown as Record<string, unknown>).evaluation_redac_note)
    : null
  // Le CTA commercial de la carte Tarification utilise le 1er contact commercial renseigné.
  const premierCommercial = firstContact(solution.contacts_commerciaux)

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
        hasComparaison={hasComparaison}
        noteGlobaleTooltip={noteGlobaleTooltip}
        displayContactsCommerciaux={displayContactsCommerciaux}
      />

      {/* Contenu — background gradient SVG */}
      <div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* 2 colonnes : contenu principal + sidebar */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-8">
            {/* Colonne gauche */}
            <div className="space-y-8 min-w-0">
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
                  hasNoteRedac={(solution.categorie as unknown as { has_note_redac?: boolean } | null)?.has_note_redac ?? true}
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
                    labelFonctionnalites={solution.categorie?.label_fonctionnalites}
                  />
                </div>
              )}

              <div id="mot-editeur" className="scroll-mt-[140px]">
                <PublisherWord
                  motEditeur={solution.mot_editeur}
                  editeur={solution.editeur}
                />
              </div>

              <div id="support" className="scroll-mt-[140px]">
                <SupportSection solution={solution} displayCommercial={displayContactsCommerciaux} />
              </div>

              <div id="communautes" className="scroll-mt-[140px]">
                <SolutionCommunautesCard
                  solutionId={solution.id}
                  solutionNom={solution.nom}
                  communautes={communautes ?? []}
                />
              </div>
            </div>

            {/* Colonne droite (sidebar) */}
            <div className="space-y-6 min-w-0">
              {displayPrixFront && (
                <TarificationCard
                  prix={{
                    prix_ttc: (solution as unknown as { prix_ttc: number | null }).prix_ttc ?? null,
                    prix_ttc_min: (solution as unknown as { prix_ttc_min: number | null }).prix_ttc_min ?? null,
                    prix_ttc_max: (solution as unknown as { prix_ttc_max: number | null }).prix_ttc_max ?? null,
                    prix_devise: (solution as unknown as { prix_devise: string | null }).prix_devise ?? null,
                    prix_frequence: (solution as unknown as { prix_frequence: string | null }).prix_frequence ?? null,
                    prix_duree_engagement_mois: (solution as unknown as { prix_duree_engagement_mois: number | null }).prix_duree_engagement_mois ?? null,
                  }}
                  contactEmail={premierCommercial?.email ?? null}
                  contactTelephone={premierCommercial?.telephone ?? null}
                />
              )}
              <div className="hidden lg:block">
                <MainFeatures tags={solution.tags || []} />
              </div>
              {solutionsLiees && solutionsLiees.length > 0 && (
                <SolutionLiensCard liens={solutionsLiees} />
              )}
              <CategoryLink categorie={solution.categorie} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
