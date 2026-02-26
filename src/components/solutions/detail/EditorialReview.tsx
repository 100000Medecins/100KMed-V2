import StarRating from '@/components/ui/StarRating'

interface EditorialReviewProps {
  avisRedaction: string | null
  noteRedaction: number | null
  pointsForts: string[] | null
  pointsFaibles: string[] | null
}

export default function EditorialReview({
  avisRedaction,
  noteRedaction,
  pointsForts,
  pointsFaibles,
}: EditorialReviewProps) {
  if (!avisRedaction && !pointsForts?.length && !pointsFaibles?.length) return null

  const fortsList = pointsForts?.filter(Boolean) || []
  const faiblesList = pointsFaibles?.filter(Boolean) || []

  return (
    <section className="bg-white rounded-card shadow-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-navy">L&apos;avis de la rédaction</h2>
        {noteRedaction != null && (
          <div className="flex items-center gap-2">
            <StarRating rating={noteRedaction} />
            <span className="text-sm font-semibold text-navy">{noteRedaction.toFixed(1)}/5</span>
          </div>
        )}
      </div>

      {avisRedaction && (
        <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{avisRedaction}</p>
      )}

      {(fortsList.length > 0 || faiblesList.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {fortsList.length > 0 && (
            <div className="bg-green-50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-rating-green mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rating-green text-white flex items-center justify-center text-xs">+</span>
                Points forts
              </h3>
              <ul className="space-y-2">
                {fortsList.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-rating-green mt-0.5 flex-shrink-0">&#10003;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {faiblesList.length > 0 && (
            <div className="bg-orange-50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-accent-orange mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent-orange text-white flex items-center justify-center text-xs">−</span>
                Points faibles
              </h3>
              <ul className="space-y-2">
                {faiblesList.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-accent-orange mt-0.5 flex-shrink-0">&#10007;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
