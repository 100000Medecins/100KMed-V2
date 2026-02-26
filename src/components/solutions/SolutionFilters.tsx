'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Tag } from '@/types/models'

interface SolutionFiltersProps {
  tags: Tag[]
  selectedTagIds: string[]
  categorieId: string
}

export default function SolutionFilters({ tags, selectedTagIds, categorieId }: SolutionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  const toggleTag = (tagId: string) => {
    const newTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]

    const params = new URLSearchParams()
    if (newTags.length > 0) {
      params.set('tags', newTags.join(','))
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  if (tags.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Filtrer par fonctionnalité</h3>
        {selectedTagIds.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-accent-blue hover:underline"
          >
            Effacer les filtres
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                isSelected
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
              }`}
            >
              {tag.libelle}
            </button>
          )
        })}
      </div>
    </div>
  )
}
