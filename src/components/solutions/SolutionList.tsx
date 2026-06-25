import Link from 'next/link'
import StarRating from '@/components/ui/StarRating'
import RatingBadge from '@/components/ui/RatingBadge'
import PriceTag from './PriceTag'
import { computeCategoryMedian, computePriceTier, type PrixInput } from '@/lib/prix'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function asPrixInput(s: Record<string, unknown>): PrixInput {
  return {
    prix_ttc: (s.prix_ttc as number | null) ?? null,
    prix_ttc_min: (s.prix_ttc_min as number | null) ?? null,
    prix_ttc_max: (s.prix_ttc_max as number | null) ?? null,
    prix_devise: (s.prix_devise as string | null) ?? null,
    prix_frequence: (s.prix_frequence as string | null) ?? null,
    prix_duree_engagement_mois: (s.prix_duree_engagement_mois as number | null) ?? null,
  }
}

interface SolutionListProps {
  solutions: any[]
  categorieSlug?: string
  tri?: string
  displayPrixFront?: boolean
}

export default function SolutionList({ solutions, categorieSlug, tri, displayPrixFront = false }: SolutionListProps) {
  if (solutions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune solution trouvée.</p>
      </div>
    )
  }

  // Médiane de la catégorie (calculée une seule fois sur l'ensemble des solutions de la liste)
  const median = displayPrixFront ? computeCategoryMedian(solutions.map(asPrixInput)) : null

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
      {solutions.map((solution) => {
        const catSlug = categorieSlug || solution.categorie?.slug
        const href = catSlug
          ? `/solutions/${catSlug}/${solution.slug}`
          : '#'

        return (
          <Link
            key={solution.id}
            href={href}
            className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 p-3 sm:p-6 flex flex-col group min-w-0"
          >
            {/* Logo */}
            <div className="w-full h-24 rounded-xl bg-surface-light flex items-center justify-center mb-4 overflow-hidden">
              {solution.logo_url ? (
                <img
                  src={solution.logo_url}
                  alt={solution.logo_titre || solution.nom}
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: '#4A90D9' }}
                >
                  {solution.nom?.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nom */}
            <h3 className="text-sm sm:text-base font-semibold text-navy group-hover:text-accent-blue transition-colors mb-3 hyphens-auto">
              {solution.nom}
            </h3>

            {/* Description */}
            {solution.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                {stripHtml(solution.description)}
              </p>
            )}

            {/* Tags */}
            {solution.tags && solution.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {solution.tags.slice(0, 3).map((t: any) => (
                  <span
                    key={t.tag?.id || t.id}
                    className="text-xs bg-surface-light text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {t.tag?.libelle || t.libelle}
                  </span>
                ))}
              </div>
            )}

            {/* Prix (si toggle global ON et prix renseigné) */}
            {displayPrixFront && (() => {
              const prix = asPrixInput(solution)
              const tier = computePriceTier(prix, median)
              return (
                <div className="mb-2">
                  <PriceTag prix={prix} tier={tier} categoryMedian={median} />
                </div>
              )
            })()}

            {/* Note */}
            {(() => {
              const isUtilisateurs = tri === 'note_utilisateurs'
              const displayNote = tri === 'nom' ? null
                : solution.noteCritere ?? (isUtilisateurs ? solution.noteUtilisateursBase5 : solution.noteRedacBase5)
              const nbAvis: number | null = solution.nbNotesUtilisateurs ?? null
              const noteLabel = isUtilisateurs && nbAvis
                ? `${nbAvis} avis`
                : isUtilisateurs
                ? 'Utilisateurs'
                : ''
              return (
                <div className="flex items-center gap-1 pt-3 border-t border-gray-100 overflow-hidden">
                  {displayNote ? (
                    <>
                      <RatingBadge rating={displayNote} size="sm" />
                      <StarRating rating={displayNote} size={12} />
                      {noteLabel && <span className="text-[10px] text-gray-400 whitespace-nowrap">{noteLabel}</span>}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Pas encore noté</span>
                  )}
                </div>
              )
            })()}
          </Link>
        )
      })}
    </div>
  )
}
