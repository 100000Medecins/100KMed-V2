'use client'

import { useState } from 'react'
import Link from 'next/link'
import StarRating from '@/components/ui/StarRating'
import RatingBadge from '@/components/ui/RatingBadge'

interface SolutionCard {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  noteRedacBase5: number | null
  categorieSlug: string
}

interface CategorieData {
  id: string
  nom: string
  slug: string
  solutions: SolutionCard[]
}

interface RecommendedSoftwareProps {
  categories: CategorieData[]
}

export default function RecommendedSoftware({ categories }: RecommendedSoftwareProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (categories.length === 0) return null

  const active = categories[activeIndex]

  return (
    <section className="bg-surface-light py-20 md:py-28" id="tools">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left sidebar */}
          <div className="lg:w-56 shrink-0">
            <h2 className="text-xl font-bold text-navy leading-snug mb-6">
              Les logiciels les mieux notés
            </h2>
            <div className="flex flex-wrap lg:flex-col gap-2">
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
            {active.solutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-gray-200 gap-3">
                <p className="text-gray-400 text-sm text-center max-w-xs">
                  Pas encore assez d'évaluations pour établir un classement — revenez bientôt ! 😊
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {active.solutions.slice(0, 3).map((sol) => (
                    <SolutionCardItem key={sol.id} solution={sol} />
                  ))}
                </div>
                {active.solutions.length > 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                    {active.solutions.slice(3, 6).map((sol) => (
                      <SolutionCardItem key={sol.id} solution={sol} />
                    ))}
                  </div>
                )}
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

function SolutionCardItem({ solution }: { solution: SolutionCard }) {
  return (
    <Link
      href={`/solutions/${solution.categorieSlug}/${solution.slug}`}
      className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col items-center text-center group"
    >
      <span className="text-sm font-semibold text-navy mb-3">{solution.nom}</span>

      {solution.noteRedacBase5 ? (
        <div className="flex items-center gap-2 mb-4">
          <RatingBadge rating={solution.noteRedacBase5} />
          <StarRating rating={solution.noteRedacBase5} />
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
