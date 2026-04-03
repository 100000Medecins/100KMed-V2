import type { Tag } from '@/types/models'

interface MainFeaturesProps {
  tags: Array<{ tag: Tag | null }>
}

export default function MainFeatures({ tags }: MainFeaturesProps) {
  const features = tags
    .map((t) => t.tag)
    .filter((t): t is Tag => t != null && t.is_tag_principal === true)

  if (features.length === 0) return null

  return (
    <section className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-lg font-bold text-navy mb-4">Principales fonctionnalités</h2>
      <ol className="space-y-3">
        {features.map((tag, i) => (
          <li key={tag.id} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-sm text-gray-700">{tag.libelle}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
