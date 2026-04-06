'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Tag } from '@/types/models'

// Tag étendu avec parent_ids et is_separator (disponible après migration + regen types)
type TagWithParent = Tag & { parent_ids?: string[]; is_separator?: boolean }

const DEFAULT_DIR: Record<string, string> = {
  nom: 'asc',
  note_redac: 'desc',
  note_utilisateurs: 'desc',
}

interface SolutionFiltersProps {
  tags: Tag[]
  selectedTagIds: string[]
  currentTri: string
  currentCritere: string
  currentDir?: string
  labelFiltres?: string
}

/**
 * Calcule les IDs des tags parents qui sont implicitement inclus
 * parce qu'un de leurs enfants est sélectionné.
 * Ex : si "LAP V2" est sélectionné et LAP_V2.parent_id = LAP_V1.id,
 * alors LAP V1 est "implied" (grisé, pas cliquable).
 */
function getImpliedParentIds(tags: TagWithParent[], selectedIds: string[]): Set<string> {
  const implied = new Set<string>()
  const queue = [...selectedIds]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    const tag = tags.find((t) => t.id === currentId)
    for (const pid of tag?.parent_ids ?? []) {
      if (!visited.has(pid)) {
        implied.add(pid)
        queue.push(pid)
      }
    }
  }
  return implied
}

export default function SolutionFilters({ tags, selectedTagIds, currentTri, currentCritere, currentDir, labelFiltres }: SolutionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const tagsWithParent = tags as TagWithParent[]

  function buildUrl(tagIds: string[]) {
    const params = new URLSearchParams()
    if (tagIds.length > 0) params.set('tags', tagIds.join(','))
    if (currentTri && currentTri !== 'nom') params.set('tri', currentTri)
    if (currentCritere) params.set('critere', currentCritere)
    if (currentDir && currentDir !== DEFAULT_DIR[currentTri]) params.set('dir', currentDir)
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

  const impliedParentIds = getImpliedParentIds(tagsWithParent, selectedTagIds)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">{labelFiltres || 'Fonctionnalités'}</h3>
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => router.push(buildUrl([]))}
            className="text-xs text-accent-blue hover:underline"
          >
            Effacer
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {tagsWithParent.map((tag) => {
          // ── Séparateur / en-tête de groupe ──
          if (tag.is_separator) {
            return (
              <div key={tag.id} className="pt-3 pb-0.5 first:pt-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {tag.libelle}
                </p>
              </div>
            )
          }

          // ── Tag normal ──
          const isSelected = selectedTagIds.includes(tag.id)
          const isImplied = impliedParentIds.has(tag.id)

          return (
            <button
              key={tag.id}
              onClick={() => !isImplied && toggleTag(tag.id)}
              disabled={isImplied}
              title={isImplied ? 'Inclus implicitement' : undefined}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors text-left ${
                isSelected
                  ? 'bg-navy text-white border-navy'
                  : isImplied
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
              }`}
            >
              {tag.libelle}
              {isImplied && <span className="ml-1 text-xs opacity-60">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
