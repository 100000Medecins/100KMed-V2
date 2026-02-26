'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RatingBadge from '@/components/ui/RatingBadge'

interface Avis {
  id: string
  user: { pseudo: string | null; portrait: string | null; specialite: string | null } | null
  moyenne_utilisateur: number | null
  last_date_note: string | null
}

interface UserReviewsSidebarProps {
  avis: Avis[]
  solutionId: string
  categorieId: string
}

export default function UserReviewsSidebar({
  avis,
  solutionId,
  categorieId,
}: UserReviewsSidebarProps) {
  const [current, setCurrent] = useState(0)

  if (avis.length === 0) return null

  const prev = () => setCurrent((c) => (c === 0 ? avis.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === avis.length - 1 ? 0 : c + 1))

  const a = avis[current]

  return (
    <section className="bg-white rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-navy">Derniers avis</h2>
        <a
          href={`/solutions/${categorieId}/${solutionId}/evaluations`} /* TODO: pass slugs */
          className="text-xs text-accent-blue hover:underline"
        >
          Tous les avis
        </a>
      </div>

      {/* Avis card */}
      <div className="bg-surface-light rounded-xl p-4 min-h-[120px]">
        <div className="flex items-center gap-3 mb-3">
          {a.user?.portrait ? (
            <img
              src={a.user.portrait}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue text-xs font-bold">
              {(a.user?.pseudo || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy truncate">
              {a.user?.pseudo || 'Anonyme'}
            </p>
            {a.user?.specialite && (
              <p className="text-xs text-gray-400">{a.user.specialite}</p>
            )}
          </div>
          {a.moyenne_utilisateur != null && (
            <RatingBadge rating={Number(a.moyenne_utilisateur)} size="sm" />
          )}
        </div>
        {a.last_date_note && (
          <p className="text-xs text-gray-400">
            {new Date(a.last_date_note).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* Navigation dots */}
      {avis.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={prev} className="text-gray-400 hover:text-navy" aria-label="Avis précédent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {avis.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-accent-blue' : 'bg-gray-200'
                }`}
                aria-label={`Avis ${i + 1}`}
              />
            ))}
          </div>
          <button onClick={next} className="text-gray-400 hover:text-navy" aria-label="Avis suivant">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  )
}
