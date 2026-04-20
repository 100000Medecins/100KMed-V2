'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import StarRating from '@/components/ui/StarRating'
import RatingBadge from '@/components/ui/RatingBadge'

interface SolutionCard {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  noteUtilisateurs: number | null
  noteRedac: number | null
  categorieSlug: string
}

interface CategorieData {
  id: string
  nom: string
  slug: string
  hasNoteRedac: boolean
  solutions: SolutionCard[]
}

interface RecommendedSoftwareProps {
  categories: CategorieData[]
}

type SortMode = 'collegues' | 'redac'

export default function RecommendedSoftware({ categories }: RecommendedSoftwareProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [sortMode, setSortMode] = useState<SortMode>('collegues')

  if (categories.length === 0) return null

  const active = categories[activeIndex]

  // Si la catégorie active n'a pas de note rédac, forcer le mode collègues
  const effectiveSortMode = active.hasNoteRedac ? sortMode : 'collegues'

  const sortedSolutions = useMemo(() => {
    return [...active.solutions]
      .filter((s) => effectiveSortMode === 'collegues' ? s.noteUtilisateurs !== null : s.noteRedac !== null)
      .sort((a, b) => {
        if (effectiveSortMode === 'collegues') return (b.noteUtilisateurs || 0) - (a.noteUtilisateurs || 0)
        return (b.noteRedac || 0) - (a.noteRedac || 0)
      })
      .slice(0, 6)
  }, [active.solutions, effectiveSortMode])

  return (
    <section className="bg-surface-light py-20 md:py-28" id="tools">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left sidebar */}
          <div className="lg:w-56 shrink-0">
            <h2 className="text-xl font-bold text-navy leading-snug mb-3">
              Les logiciels les mieux notés
            </h2>

            {/* Toggle par collègues / par rédaction */}
            <div className="flex flex-col gap-1 mb-5">
              <button
                onClick={() => setSortMode('collegues')}
                className={`text-left text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                  effectiveSortMode === 'collegues'
                    ? 'text-accent-blue bg-accent-blue/10'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {effectiveSortMode === 'collegues' ? '▸ ' : ''}par vos collègues
              </button>
              {active.hasNoteRedac && (
                <button
                  onClick={() => setSortMode('redac')}
                  className={`text-left text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                    effectiveSortMode === 'redac'
                      ? 'text-accent-blue bg-accent-blue/10'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {effectiveSortMode === 'redac' ? '▸ ' : ''}par 100&nbsp;000 Médecins
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveIndex(i)}
                  className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors text-left ${
                    activeIndex === i
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  }`}
                >
                  {cat.nom}
                </button>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          <div className="flex-1">
            {sortedSolutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-gray-200 gap-3">
                <p className="text-gray-400 text-sm text-center max-w-xs">
                  {effectiveSortMode === 'redac'
                    ? "Pas encore d'évaluation de la rédaction dans cette catégorie."
                    : "Pas encore assez d'évaluations pour établir un classement — revenez bientôt ! 😊"}
                </p>
                <p className="text-gray-500 text-sm">Ou évaluez le vôtre dès maintenant&nbsp;:</p>
                <Link
                  href="/solution/noter"
                  className="inline-flex items-center gap-2 bg-navy text-white font-semibold px-5 py-2.5 rounded-full hover:bg-navy/90 transition-colors text-sm"
                >
                  Évaluer un logiciel
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {sortedSolutions.map((sol) => (
                    <SolutionCardItem key={sol.id} solution={sol} sortMode={effectiveSortMode} />
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <Link
                    href={`/solutions/${active.slug}`}
                    className="inline-flex items-center gap-2 bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy/90 transition-colors"
                  >
                    Afficher plus de choix
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function SolutionCardItem({ solution, sortMode }: { solution: SolutionCard; sortMode: SortMode }) {
  const note = sortMode === 'collegues' ? solution.noteUtilisateurs : solution.noteRedac

  return (
    <Link
      href={`/solutions/${solution.categorieSlug}/${solution.slug}`}
      className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col items-center text-center group"
    >
      <span className="text-sm font-semibold text-navy mb-3">{solution.nom}</span>

      {note ? (
        <div className="flex items-center gap-2 mb-4">
          <RatingBadge rating={note} />
          <StarRating rating={note} />
        </div>
      ) : (
        <div className="mb-4">
          <span className="text-xs text-gray-400">Pas encore noté</span>
        </div>
      )}

      <div className="w-full h-20 rounded-xl bg-surface-light flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden">
        {solution.logo_url ? (
          <img
            src={solution.logo_url}
            alt={solution.nom}
            className="w-full h-full object-contain p-3"
          />
        ) : (
          <span className="text-2xl font-bold text-accent-blue">
            {solution.nom.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  )
}
