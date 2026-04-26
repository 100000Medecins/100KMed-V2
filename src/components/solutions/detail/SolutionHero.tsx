import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import Button from '@/components/ui/Button'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { sanitizeHtml } from '@/lib/sanitize'
import AcronymHtml from '@/components/AcronymHtml'
import type { SolutionWithRelations } from '@/types/models'

interface SolutionHeroProps {
  solution: SolutionWithRelations
  noteRedaction: number | null
  noteUtilisateurs: number | null
  nbEvaluations: number
  categorieSlug: string
  hasDetailedRatings: boolean
}

/** Carte de note — design identique pour utilisateurs & rédaction */
function RatingCard({
  rating,
  label,
  subtitle,
}: {
  rating: number
  label: string
  subtitle?: string
}) {
  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-5 text-center shadow-sm">
      <p className="text-4xl font-bold text-navy leading-none">
        {rating.toFixed(1)}
      </p>
      <div className="flex justify-center mt-2">
        <StarRating rating={rating} size={16} />
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
      )}
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2.5 font-medium leading-tight">
        {label}
      </p>
    </div>
  )
}

export default function SolutionHero({
  solution,
  noteRedaction,
  noteUtilisateurs,
  nbEvaluations,
  categorieSlug,
  hasDetailedRatings,
}: SolutionHeroProps) {
  const anchors = [
    { id: 'avis-redaction', label: 'Avis de la rédaction', show: !!solution.evaluation_redac_avis },
    { id: 'galerie', label: 'Galerie', show: !!(solution.galerie && solution.galerie.length > 0) },
    { id: 'notes-detaillees', label: 'Evaluation détaillée', show: hasDetailedRatings },
    { id: 'avis-utilisateurs', label: 'Notes utilisateurs', show: true },
    { id: 'mot-editeur', label: 'Mot éditeur', show: !!solution.mot_editeur },
  ].filter(a => a.show)
  return (
    <div>
      {/* Bande fil d'Ariane */}
      <div className="bg-white/70 border-b border-gray-200/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5">
          <Breadcrumb variant="default" items={[
            { label: 'Accueil', href: '/' },
            ...(solution.categorie ? [{ label: solution.categorie.nom, href: `/solutions/${categorieSlug}` }] : []),
            { label: solution.nom },
          ]} />
        </div>
      </div>

      {/* Hero content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-8">
          {/* Carte principale — contient tout */}
          <div className="px-8 py-8 bg-white rounded-2xl shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Colonne gauche : logo, titre, description, CTAs */}
              <div className="flex-1 min-w-0">
                {/* Logo + titre */}
                <div className="flex items-start gap-5 mb-6">
                  {solution.logo_url ? (
                    <img
                      src={solution.logo_url}
                      alt={solution.logo_titre || solution.nom}
                      className="h-16 w-auto max-w-[120px] rounded-xl object-contain bg-gray-50 p-2 shadow-sm border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-navy font-bold text-xl flex-shrink-0">
                      {solution.nom.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-navy">
                      {solution.nom}
                    </h1>
                    {solution.editeur && (
                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                        Edité par{' '}
                        <Link
                          href={`/editeur/${solution.editeur.id}`}
                          className="hover:text-navy hover:underline ml-1"
                        >
                          {solution.editeur.nom_commercial || solution.editeur.nom}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {solution.description && (
                  <AcronymHtml
                    html={sanitizeHtml(solution.description)}
                    className="text-gray-600 leading-relaxed mb-6 text-sm md:text-base prose prose-sm max-w-none"
                  />
                )}

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" href={`/solution/noter/${categorieSlug}/${solution.slug}`}>
                    Évaluer {solution.nom}
                  </Button>
                  {!!(solution as unknown as Record<string, unknown>).website && (
                    <a
                      href={(solution as unknown as Record<string, unknown>).website as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-button border-2 border-gray-200 text-gray-700 hover:border-navy hover:text-navy transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Site internet
                    </a>
                  )}
                </div>
              </div>

              {/* Colonne droite : cartes de notes côte à côte */}
              {(noteUtilisateurs != null || noteRedaction != null) && (
                <div className="flex gap-3 flex-shrink-0">
                  {noteUtilisateurs != null && (
                    <RatingCard
                      rating={noteUtilisateurs}
                      label="Notes des utilisateurs"
                      subtitle={nbEvaluations > 0 ? `${nbEvaluations} avis` : undefined}
                    />
                  )}
                  {noteRedaction != null && (
                    <RatingCard
                      rating={noteRedaction}
                      label="Note de la rédaction"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Anchor tabs */}
      <div className="sticky top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <nav className="flex flex-wrap justify-center gap-2 md:justify-start md:flex-nowrap md:gap-3 md:overflow-x-auto md:scrollbar-hide">
            {anchors.map((anchor) => (
              <a
                key={anchor.id}
                href={`#${anchor.id}`}
                className="px-4 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 bg-white rounded-full shadow-sm hover:shadow-md hover:text-navy transition-all whitespace-nowrap"
              >
                {anchor.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
