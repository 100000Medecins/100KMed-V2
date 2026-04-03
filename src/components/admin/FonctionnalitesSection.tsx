'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  toggleFonctionnalite,
  createFonctionnalite,
  deleteFonctionnalite,
  reorderFonctionnalites,
} from '@/lib/actions/admin'
import type { TagForSolution } from '@/lib/db/admin-solutions'

interface FonctionnalistesSectionProps {
  solutionId: string
  categorieId: string | null
  initialTags: TagForSolution[]
}

export default function FonctionnalitesSection({
  solutionId,
  categorieId,
  initialTags,
}: FonctionnalistesSectionProps) {
  const [tags, setTags] = useState(initialTags)
  const [newLibelle, setNewLibelle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleToggle(tagId: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, enabled: newEnabled } : t))
    )
    startTransition(async () => {
      await toggleFonctionnalite(solutionId, tagId, newEnabled)
    })
  }

  function handleAdd() {
    const libelle = newLibelle.trim()
    if (!libelle) return
    setError(null)
    startTransition(async () => {
      const result = await createFonctionnalite(categorieId, libelle)
      if (result?.error) {
        setError(result.error)
      } else if (result?.tag) {
        setTags((prev) => [...prev, result.tag])
        setNewLibelle('')
      }
    })
  }

  function handleDelete(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId))
    startTransition(async () => {
      await deleteFonctionnalite(tagId)
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

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {tags.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Aucune fonctionnalité pour le moment.
        </p>
      )}

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
          {/* Drag handle */}
          <div
            draggable
            onDragStart={() => handleDragStart(index)}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            title="Glisser pour réordonner"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <span className="text-sm text-navy flex-1">{tag.libelle}</span>

          <div className="flex items-center gap-2">
            {/* Toggle */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleToggle(tag.id, tag.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 disabled:opacity-50 ${
                tag.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={tag.enabled ? 'Désactiver' : 'Activer'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  tag.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            {/* Delete */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(tag.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Supprimer cette fonctionnalité"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Add new */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={newLibelle}
          onChange={(e) => setNewLibelle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Nouvelle fonctionnalité..."
          className="flex-1 rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-4 py-2"
        />
        <button
          type="button"
          disabled={isPending || !newLibelle.trim()}
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-sm font-medium bg-navy text-white hover:bg-navy-dark transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>
    </div>
  )
}
