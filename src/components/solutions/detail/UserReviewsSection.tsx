'use client'

import { Star } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import type { ResultatWithCritere } from '@/types/models'

interface UserReviewsSectionProps {
  resultats: ResultatWithCritere[]
  noteUtilisateursData?: { note: number | null; total: number; distribution: Record<string, number> }
}

/** Étoiles inline pour la carte de synthèse (sur fond vert) */
function SummaryStars({ rating, max = 5 }: { rating: number; max?: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.3
  const stars = []

  for (let i = 0; i < max; i++) {
    if (i < fullStars) {
      stars.push(
        <Star
          key={i}
          className="text-rating-star fill-rating-star"
          style={{ width: 20, height: 20 }}
        />
      )
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative" style={{ width: 20, height: 20 }}>
          <Star
            className="absolute text-white/30 fill-white/30"
            style={{ width: 20, height: 20 }}
          />
          <div className="absolute overflow-hidden" style={{ width: 10, height: 20 }}>
            <Star
              className="text-rating-star fill-rating-star"
              style={{ width: 20, height: 20 }}
            />
          </div>
        </div>
      )
    } else {
      stars.push(
        <Star
          key={i}
          className="text-white/30 fill-white/30"
          style={{ width: 20, height: 20 }}
        />
      )
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>
}

/** Carte de synthèse des notes (remplace l'ancienne carte NPS) */
function RatingSummaryCard({
  averageRating,
  totalReviews,
  distribution,
}: {
  averageRating: number
  totalReviews: number
  distribution: Record<string, number>
}) {
  const starLevels = [5, 4, 3, 2, 1]
  const counts = starLevels.map((s) => distribution[String(s)] || 0)
  const maxCount = Math.max(...counts, 1) // min 1 pour éviter division par 0

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-rating-green to-emerald-500">
      <div className="flex flex-col md:flex-row">
        {/* Gauche : note moyenne + étoiles + nb évaluations */}
        <div className="flex flex-col items-center justify-center gap-2 p-6 md:p-8 md:w-2/5">
          <p className="text-5xl font-bold text-white">
            {averageRating.toFixed(1)}
          </p>
          <SummaryStars rating={averageRating} />
          <p className="text-sm text-white/80">
            {totalReviews} évaluation{totalReviews > 1 ? 's' : ''}
          </p>
        </div>

        {/* Droite : bar chart répartition par étoile */}
        <div className="flex-1 p-6 md:p-8 md:pl-4 flex flex-col justify-center gap-2">
          {starLevels.map((star, idx) => {
            const count = counts[idx]
            const pct = (count / maxCount) * 100

            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-white font-medium w-8 text-right shrink-0">
                  {star} ★
                </span>
                <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-white/80 w-10 text-right tabular-nums shrink-0">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function UserReviewsSection({
  resultats,
  noteUtilisateursData,
}: UserReviewsSectionProps) {
  const averageRating = noteUtilisateursData?.note ?? null
  const totalReviews = noteUtilisateursData?.total ?? 0
  const distribution = noteUtilisateursData?.distribution ?? {}

  // Critères individuels (hors synthèse et NPS), triés dans un ordre fixe
  const CRITERE_ORDER: Record<string, number> = {
    'Interface utilisateur': 0,
    'Fonctionnalités': 1,
    'Fiabilité': 2,
    'Éditeur': 3,
    'Editeur': 3,
    'Rapport qualité/prix': 4,
  }
  const userCriteres = resultats
    .filter((r) => r.critere && r.critere.type !== 'synthese' && r.critere.type !== 'nps')
    .sort((a, b) =>
      (CRITERE_ORDER[a.critere?.nom_court || ''] ?? 99) - (CRITERE_ORDER[b.critere?.nom_court || ''] ?? 99)
    )

  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-6 py-5">
        <h2 className="text-xl font-bold text-navy">L&apos;avis de vos confrères</h2>
      </div>

      {/* Carte de synthèse des notes */}
      {averageRating != null && (
        <div className="mx-6 mb-6">
          <RatingSummaryCard
            averageRating={averageRating}
            totalReviews={totalReviews}
            distribution={distribution}
          />
        </div>
      )}

      {/* Liste critères avec étoiles */}
      {userCriteres.length > 0 && (
        <div className="px-6 pb-6">
          <div className="divide-y divide-gray-100">
            {userCriteres.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm text-rating-green font-medium">
                  {r.critere?.nom_court || r.critere?.nom_long}
                </span>
                <StarRating
                  rating={Number(r.moyenne_utilisateurs_base5 ?? 0)}
                  size={18}
                  color="green"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
