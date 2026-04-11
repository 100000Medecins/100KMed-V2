'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { Tag } from '@/types/models'

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
      if (!visited.has(pid)) { implied.add(pid); queue.push(pid) }
    }
  }
  return implied
}

/** Découpe la liste de tags en groupes délimités par les séparateurs */
function buildGroups(tags: TagWithParent[]): { label: string | null; id: string; items: TagWithParent[] }[] {
  const groups: { label: string | null; id: string; items: TagWithParent[] }[] = []
  let current: { label: string | null; id: string; items: TagWithParent[] } = { label: null, id: '__root__', items: [] }
  groups.push(current)
  for (const tag of tags) {
    if (tag.is_separator) {
      current = { label: tag.libelle ?? null, id: tag.id, items: [] }
      groups.push(current)
    } else {
      current.items.push(tag)
    }
  }
  return groups.filter((g) => g.items.length > 0)
}

export default function SolutionFilters({ tags, selectedTagIds, currentTri, currentCritere, currentDir, labelFiltres }: SolutionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const tagsWithParent = tags as TagWithParent[]

  const groups = buildGroups(tagsWithParent)

  // Sur mobile : chaque groupe est fermé par défaut sauf si un tag y est sélectionné
  const initialOpen = () => {
    const open: Record<string, boolean> = {}
    for (const g of groups) {
      open[g.id] = g.items.some((t) => selectedTagIds.includes(t.id))
    }
    return open
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-navy">{labelFiltres || 'Fonctionnalités'}</h3>
        {selectedTagIds.length > 0 && (
          <button onClick={() => router.push(buildUrl([]))} className="text-xs text-accent-blue hover:underline">
            Effacer
          </button>
        )}
      </div>

      {groups.map((group) => {
        const hasSelected = group.items.some((t) => selectedTagIds.includes(t.id))
        const isOpen = openGroups[group.id] ?? false

        return (
          <div key={group.id}>
            {/* Séparateur cliquable sur mobile, statique sur desktop */}
            {group.label && (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between w-full pt-3 pb-1 sm:cursor-default"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  {group.label}
                  {hasSelected && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  )}
                </p>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-300 transition-transform duration-200 sm:hidden ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}

            {/* Items — toujours visibles sur desktop, accordéon sur mobile */}
            <div className={`flex flex-col gap-1.5 mt-1 ${group.label ? (isOpen ? 'block' : 'hidden sm:flex') : 'flex'} sm:flex`}>
              {group.items.map((tag) => {
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
      })}
    </div>
  )
}
