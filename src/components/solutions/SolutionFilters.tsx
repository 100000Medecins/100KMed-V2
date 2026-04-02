'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Tag, Critere } from '@/types/models'

interface SolutionFiltersProps {
  tags: Tag[]
  selectedTagIds: string[]
  criteresMajeurs: Critere[]
  currentTri: string
}

const TRI_OPTIONS = [
  { value: 'nom', label: 'Nom A → Z' },
  { value: 'note_redac', label: 'Note de l\'association' },
  { value: 'note_utilisateurs', label: 'Note des utilisateurs' },
]

export default function SolutionFilters({ tags, selectedTagIds, criteresMajeurs, currentTri }: SolutionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  function buildUrl(tags: string[], tri: string) {
    const params = new URLSearchParams()
    if (tags.length > 0) params.set('tags', tags.join(','))
    if (tri && tri !== 'nom') params.set('tri', tri)
    const q = params.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  const toggleTag = (tagId: string) => {
    const newTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    router.push(buildUrl(newTags, currentTri))
  }

  const setTri = (tri: string) => {
    router.push(buildUrl(selectedTagIds, tri))
  }

  const clearAll = () => router.push(pathname)

  const hasFilters = selectedTagIds.length > 0 || (currentTri && currentTri !== 'nom')

  return (
    <div className="space-y-6">

      {/* Trier par */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">Trier par</h3>
        <div className="flex flex-col gap-2">
          {TRI_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTri(opt.value)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left ${
                currentTri === opt.value
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {criteresMajeurs.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1 px-1">
                Par critère
              </p>
              {criteresMajeurs.map((c) => {
                const value = `critere_${c.id}`
                const label = c.nom_court || c.nom_capital || c.nom_long || 'Critère'
                return (
                  <button
                    key={c.id}
                    onClick={() => setTri(value)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left ${
                      currentTri === value
                        ? 'bg-accent-blue text-white border-accent-blue'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-accent-blue hover:text-accent-blue'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Filtrer par tag */}
      {tags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy mb-3">Filtrer par fonctionnalité</h3>
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
      )}

      {/* Tout effacer */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-xs text-accent-blue hover:underline w-full text-left"
        >
          Effacer tous les filtres
        </button>
      )}
    </div>
  )
}
