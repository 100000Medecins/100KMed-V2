'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Tag } from '@/types/models'

interface SolutionFiltersProps {
  tags: Tag[]
  selectedTagIds: string[]
  currentTri: string
}

export default function SolutionFilters({ tags, selectedTagIds, currentTri }: SolutionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  function buildUrl(tagIds: string[]) {
    const params = new URLSearchParams()
    if (tagIds.length > 0) params.set('tags', tagIds.join(','))
    if (currentTri && currentTri !== 'nom') params.set('tri', currentTri)
    const q = params.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  const toggleTag = (tagId: string) => {
    const newTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    router.push(buildUrl(newTags))
  }

  if (tags.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">Fonctionnalités</h3>
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => router.push(buildUrl([]))}
            className="text-xs text-accent-blue hover:underline"
          >
            Effacer
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left ${
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
