import Link from 'next/link'
import { ExternalLink, ChevronRight } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import Button from '@/components/ui/Button'
import type { SolutionWithRelations } from '@/types/models'

const SVG_GRADIENT_BG = `url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMzg0MCIgaGVpZ2h0PSIyMTYwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImIiIGN4PSIxMDAlIiBjeT0iMTAwJSIgcj0iMTAwJSIgZng9IjEwMCUiIGZ5PSIxMDAlIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAgLTEgLjU2MjUgMCAuNDM4IDIpIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMkM3QjhDIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNUNBQ0E5IiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iYyIgY3g9IjAlIiBjeT0iMCUiIHI9IjEwMi4yNDklIiBmeD0iMCUiIGZ5PSIwJSIgZ3JhZGllbnRUcmFuc2Zvcm09InNjYWxlKC41NjI1IDEuMDEwMjYpIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzk3NEI3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMzk3NEI3IiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iZCIgY3g9IjAlIiBjeT0iMTAwJSIgcj0iMTAwJSIgZng9IjAlIiBmeT0iMTAwJSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwIC0xIC41NjI1IDAgLS41NjMgMSkiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGMUI5ODYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGMUI5ODYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJlIiBjeD0iNDEuNjU1JSIgY3k9IjU3LjQ3NCUiIHI9IjUxLjc3MSUiIGZ4PSI0MS42NTUlIiBmeT0iNTcuNDc0JSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwIDEgLS44MDE3OSAwIC44NzcgLjE1OCkiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNFRjkxQTEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNFRjkxQTEiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHBhdGggaWQ9ImEiIGQ9Ik0wIDBoMzg0MHYyMTYwSDB6Ii8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwIDE5MjAgMTA4MCkiPjx1c2UgeGxpbms6aHJlZj0iI2EiIGZpbGw9InVybCgjYikiLz48dXNlIHhsaW5rOmhyZWY9IiNhIiBmaWxsPSJ1cmwoI2MpIi8+PHVzZSB4bGluazpocmVmPSIjYSIgZmlsbD0idXJsKCNkKSIvPjx1c2UgeGxpbms6aHJlZj0iI2EiIGZpbGw9InVybCgjZSkiLz48L2c+PC9zdmc+) center/cover no-repeat`

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
    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-center min-w-[150px]">
      <p className="text-4xl font-bold text-navy leading-none">
        {rating.toFixed(1)}
      </p>
      <div className="flex justify-center mt-2">
        <StarRating rating={rating} size={16} />
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
      )}
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2 font-medium">
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
      {/* Breadcrumb */}
      <div className="bg-surface-light border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-navy">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            {solution.categorie && (
              <>
                <Link href={`/solutions/${categorieSlug}`} className="hover:text-navy">
                  {solution.categorie.nom}
                </Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-navy font-medium">{solution.nom}</span>
          </nav>
        </div>
      </div>

      {/* Hero content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Carte principale */}
          <div className="px-8 py-8 bg-white rounded-2xl shadow-sm">
            {/* Logo rectangle + titre */}
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
              <p className="text-gray-600 leading-relaxed mb-6 text-sm md:text-base">
                {solution.description}
              </p>
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

          {/* Sidebar droite : cartes de notes (alignée sur la sidebar du contenu) */}
          <div className="flex flex-col gap-4">
            {noteUtilisateurs != null && (
              <RatingCard
                rating={noteUtilisateurs}
                label="Notes des utilisateurs"
                subtitle={`${nbEvaluations} avis`}
              />
            )}
            {noteRedaction != null && (
              <RatingCard
                rating={noteRedaction}
                label="Note de la rédaction"
              />
            )}
          </div>
        </div>
      </div>

      {/* Anchor tabs */}
      <div className="sticky top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <nav className="flex gap-3 overflow-x-auto scrollbar-hide">
            {anchors.map((anchor) => (
              <a
                key={anchor.id}
                href={`#${anchor.id}`}
                className="flex-shrink-0 px-6 py-2.5 text-sm font-medium text-gray-700 bg-white rounded-full shadow-sm hover:shadow-md hover:text-navy transition-all whitespace-nowrap"
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
