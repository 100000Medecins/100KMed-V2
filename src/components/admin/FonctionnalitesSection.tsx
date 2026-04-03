'use client'

import { useState, useTransition, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { toggleTagPrincipale, reorderFonctionnalites } from '@/lib/actions/admin'
import type { TagForSolution } from '@/lib/db/admin-solutions'

interface FonctionnalistesSectionProps {
  solutionId: string
  initialTags: TagForSolution[]
}

export default function FonctionnalitesSection({
  solutionId,
  initialTags,
}: FonctionnalistesSectionProps) {
  // N'affiche que les tags associés à la solution
  const [tags, setTags] = useState(() => initialTags.filter((t) => t.enabled))
  const [isPending, startTransition] = useTransition()
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleTogglePrincipale(tagId: string, currentPrincipale: boolean) {
    const newVal = !currentPrincipale
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, is_principale: newVal } : t))
    )
    startTransition(async () => {
      await toggleTagPrincipale(solutionId, tagId, newVal)
    })
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const updated = [...tags]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setTags(updated)
    dragIndexRef.current = null
    setDragOverIndex(null)
    startTransition(async () => {
      await reorderFonctionnalites(updated.map((t) => t.id))
    })
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Aucune fonctionnalité associée à cette solution. Associez-en d&apos;abord dans la section &quot;Fonctionnalités&quot; ci-dessous.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tags.map((tag, index) => (
        <div
          key={tag.id}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 py-2 px-3 bg-surface-light rounded-xl transition-all ${
            dragOverIndex === index ? 'ring-2 ring-accent-blue bg-blue-50' : ''
          }`}
        >
          <div
            draggable
            onDragStart={() => handleDragStart(index)}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            title="Glisser pour réordonner"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <span className="text-sm text-navy flex-1">{tag.libelle}</span>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleTogglePrincipale(tag.id, tag.is_principale)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 disabled:opacity-50 ${
              tag.is_principale ? 'bg-green-500' : 'bg-gray-300'
            }`}
            title={tag.is_principale ? 'Retirer des principales' : 'Marquer comme principale'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                tag.is_principale ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      ))}
      <p className="text-xs text-gray-400 mt-1">
        Les fonctionnalités activées s&apos;affichent sur la page de la solution.
      </p>
    </div>
  )
}
