'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import {
  createFonctionnalite,
  createSeparateur,
  deleteFonctionnalite,
  renameFonctionnalite,
  reorderFonctionnalites,
  updateTagParents,
} from '@/lib/actions/admin'
import type { TagForCategorie } from '@/lib/db/admin-solutions'

interface TagsCategorieSectionProps {
  categorieId: string
  initialTags: TagForCategorie[]
}

export default function TagsCategorieSection({
  categorieId,
  initialTags,
}: TagsCategorieSectionProps) {
  const [tags, setTags] = useState(initialTags)
  const [newLibelle, setNewLibelle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openParentFor, setOpenParentFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Fermer le popover en cliquant à l'extérieur
  useEffect(() => {
    if (!openParentFor) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenParentFor(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openParentFor])

  function handleAdd() {
    const libelle = newLibelle.trim()
    if (!libelle) return
    setError(null)
    startTransition(async () => {
      const result = await createFonctionnalite(categorieId, libelle)
      if (result?.error) {
        setError(result.error)
      } else if (result?.tag) {
        setTags((prev) => [...prev, { ...result.tag, parent_ids: [], is_separator: false }])
        setNewLibelle('')
      }
    })
  }

  function handleAddSeparateur() {
    setError(null)
    startTransition(async () => {
      const result = await createSeparateur(categorieId)
      if (!result) { setError('Erreur inconnue'); return }
      if ('error' in result) { setError(result.error ?? 'Erreur inconnue'); return }
      if (result.tag) {
        setTags((prev) => [...prev, result.tag])
        setEditingId(result.tag.id)
        setEditingValue(result.tag.libelle ?? '')
      }
    })
  }

  function handleDelete(tagId: string) {
    setTags((prev) =>
      prev
        .filter((t) => t.id !== tagId)
        .map((t) => ({
          ...t,
          parent_ids: t.parent_ids.filter((pid: string) => pid !== tagId),
        }))
    )
    startTransition(async () => {
      await deleteFonctionnalite(tagId)
    })
  }

  function startEditing(tag: TagForCategorie) {
    setEditingId(tag.id)
    setEditingValue(tag.libelle ?? '')
  }

  function commitEdit(tagId: string) {
    const libelle = editingValue.trim()
    setEditingId(null)
    if (!libelle) return
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, libelle } : t))
    )
    startTransition(async () => {
      await renameFonctionnalite(tagId, libelle)
    })
  }

  function handleParentToggle(tagId: string, parentId: string, checked: boolean) {
    const tag = tags.find((t) => t.id === tagId)
    if (!tag) return
    const newParentIds = checked
      ? [...tag.parent_ids, parentId]
      : tag.parent_ids.filter((id: string) => id !== parentId)

    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, parent_ids: newParentIds } : t))
    )
    startTransition(async () => {
      await updateTagParents(tagId, newParentIds)
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
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {tags.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Aucune fonctionnalité pour cette catégorie.
        </p>
      )}

      {tags.map((tag, index) => {
        const isPopoverOpen = openParentFor === tag.id
        // Exclure les séparateurs des options "Valide aussi"
        const otherRealTags = tags.filter((t) => t.id !== tag.id && !t.is_separator)
        const dragRingClass = dragOverIndex === index ? 'ring-2 ring-accent-blue bg-blue-50' : ''

        // ── Séparateur ──────────────────────────────────────────────
        if (tag.is_separator) {
          return (
            <div
              key={tag.id}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 py-1.5 px-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all ${dragRingClass}`}
            >
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {editingId === tag.id ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => commitEdit(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(tag.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider bg-white border border-accent-blue/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(tag)}
                  className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left hover:text-gray-600 transition-colors"
                  title="Cliquer pour renommer ce groupe"
                >
                  {tag.libelle || 'Groupe sans nom'}
                </button>
              )}

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(tag.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                title="Supprimer ce séparateur"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }

        // ── Tag normal ───────────────────────────────────────────────
        return (
          <div
            key={tag.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 py-2 px-3 bg-surface-light rounded-xl transition-all ${dragRingClass}`}
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

            {/* Libellé — cliquable pour éditer */}
            {editingId === tag.id ? (
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => commitEdit(tag.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(tag.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 min-w-0 text-sm text-navy bg-white border border-accent-blue/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEditing(tag)}
                className="flex-1 min-w-0 text-sm text-navy text-left truncate hover:text-accent-blue transition-colors"
                title="Cliquer pour renommer"
              >
                {tag.libelle}
              </button>
            )}

            {/* Bouton "Valide aussi" avec popover checkboxes */}
            <div className="relative flex-shrink-0" ref={isPopoverOpen ? popoverRef : undefined}>
              <button
                type="button"
                disabled={isPending || otherRealTags.length === 0}
                onClick={() => setOpenParentFor(isPopoverOpen ? null : tag.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors disabled:opacity-40 ${
                  tag.parent_ids.length > 0
                    ? 'border-accent-blue/40 text-accent-blue bg-accent-blue/5'
                    : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                }`}
                title="Définir les fonctionnalités automatiquement validées"
              >
                Valide aussi
                {tag.parent_ids.length > 0 && (
                  <span className="ml-0.5 font-semibold">({tag.parent_ids.length})</span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${isPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPopoverOpen && otherRealTags.length > 0 && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-card p-2 min-w-[220px] max-h-60 overflow-y-auto">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 pb-1.5">
                    Valide automatiquement
                  </p>
                  {otherRealTags.map((other) => (
                    <label
                      key={other.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-light cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={tag.parent_ids.includes(other.id)}
                        onChange={(e) =>
                          handleParentToggle(tag.id, other.id, e.target.checked)
                        }
                        className="w-4 h-4 rounded accent-navy"
                      />
                      <span className="text-sm text-navy">{other.libelle}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Supprimer */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(tag.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
              title="Supprimer cette fonctionnalité"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      })}

      {tags.length > 0 && (
        <p className="text-xs text-gray-400">
          &quot;Valide aussi&quot; : cochez les fonctionnalités implicitement validées.
          Ex : &quot;LAP certifié HAS V2&quot; valide aussi &quot;LAP certifié HAS V1&quot;.
        </p>
      )}

      {/* Ajouter un séparateur de groupe */}
      <div className="flex justify-start pt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={handleAddSeparateur}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un groupe
        </button>
      </div>

      {/* Ajouter une fonctionnalité */}
      <div className="flex items-center gap-2 pt-1">
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
