import Link from 'next/link'
import StarRating from '@/components/ui/StarRating'
import RatingBadge from '@/components/ui/RatingBadge'

interface SolutionListProps {
  solutions: any[]
  categorieSlug?: string
  tri?: string
}

export default function SolutionList({ solutions, categorieSlug, tri }: SolutionListProps) {
  if (solutions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune solution trouvée.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {solutions.map((solution) => {
        const catSlug = categorieSlug || solution.categorie?.slug
        const href = catSlug
          ? `/solutions/${catSlug}/${solution.slug}`
          : '#'

        return (
          <Link
            key={solution.id}
            href={href}
            className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col group"
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
            <h3 className="font-semibold text-navy group-hover:text-accent-blue transition-colors mb-3">
              {solution.nom}
            </h3>

            {/* Description */}
            {solution.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                {solution.description}
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

            {/* Note */}
            {(() => {
              const isUtilisateurs = tri === 'note_utilisateurs'
              const displayNote = solution.noteCritere ?? (isUtilisateurs ? solution.noteUtilisateursBase5 : solution.noteRedacBase5) ?? solution.noteRedacBase5
              const nbAvis: number | null = solution.nbNotesUtilisateurs ?? null
              const noteLabel = isUtilisateurs && nbAvis
                ? `${nbAvis} avis`
                : isUtilisateurs
                ? 'Utilisateurs'
                : ''
              return (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {displayNote ? (
                    <>
                      <RatingBadge rating={displayNote} />
                      <StarRating rating={displayNote} />
                      {noteLabel && <span className="text-xs text-gray-400">{noteLabel}</span>}
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
