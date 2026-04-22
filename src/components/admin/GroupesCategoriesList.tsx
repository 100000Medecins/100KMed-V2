'use client'

import { useState, useRef, useTransition } from 'react'
import { GripVertical, Check, X, Trash2, Plus } from 'lucide-react'
import {
  createGroupe,
  updateGroupe,
  deleteGroupe,
  reorderGroupes,
  updateCategorieGroupe,
} from '@/lib/actions/groupes'
import { reorderCategories } from '@/lib/actions/admin'
import type { Groupe } from '@/lib/db/categories'

type CategorieSimple = { id: string; nom: string; groupe_id: string | null }

interface Props {
  initialGroupes: Groupe[]
  categories: CategorieSimple[]
}

export default function GroupesCategoriesList({ initialGroupes, categories }: Props) {
  const [groupes, setGroupes] = useState(initialGroupes)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNom, setEditingNom] = useState('')
  const [newNom, setNewNom] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cats, setCats] = useState(categories)

  // Drag groupes
  const groupeDragIndexRef = useRef<number | null>(null)
  const [groupeDragOverIndex, setGroupeDragOverIndex] = useState<number | null>(null)

  // Drag catégories dans un groupe
  const catDragRef = useRef<{ groupeId: string; index: number } | null>(null)
  const [catDragOver, setCatDragOver] = useState<{ groupeId: string; index: number } | null>(null)

  const [, startTransition] = useTransition()

  // ── Calcul ordre global des catégories ───────────────────────────────────
  // Utilisé après chaque réordonnancement de cat dans un groupe

  function globalCatOrder(updatedCats: CategorieSimple[], updatedGroupes: Groupe[]): string[] {
    const ids: string[] = []
    for (const g of updatedGroupes) {
      for (const c of updatedCats.filter((c) => c.groupe_id === g.id)) {
        ids.push(c.id)
      }
    }
    for (const c of updatedCats.filter((c) => !c.groupe_id)) {
      ids.push(c.id)
    }
    return ids
  }

  // ── Drag & drop groupes ───────────────────────────────────────────────────

  function handleGroupeDragStart(index: number) {
    groupeDragIndexRef.current = index
  }

  function handleGroupeDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setGroupeDragOverIndex(index)
  }

  function handleGroupeDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = groupeDragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) { setGroupeDragOverIndex(null); return }
    const updated = [...groupes]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setGroupes(updated)
    groupeDragIndexRef.current = null
    setGroupeDragOverIndex(null)
    setSaving(true)
    startTransition(async () => {
      await reorderGroupes(updated.map((g) => g.id))
      setSaving(false)
    })
  }

  function handleGroupeDragEnd() {
    groupeDragIndexRef.current = null
    setGroupeDragOverIndex(null)
  }

  // ── Drag & drop catégories dans un groupe ─────────────────────────────────

  function handleCatDragStart(groupeId: string, index: number) {
    catDragRef.current = { groupeId, index }
  }

  function handleCatDragOver(e: React.DragEvent, groupeId: string, index: number) {
    e.preventDefault()
    e.stopPropagation()
    setCatDragOver({ groupeId, index })
  }

  function handleCatDrop(e: React.DragEvent, groupeId: string, dropIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    const drag = catDragRef.current
    if (!drag || drag.groupeId !== groupeId || drag.index === dropIndex) {
      setCatDragOver(null)
      return
    }

    // Réordonner les catégories du groupe
    const groupCats = cats.filter((c) => c.groupe_id === groupeId)
    const [moved] = groupCats.splice(drag.index, 1)
    groupCats.splice(dropIndex, 0, moved)

    // Reconstruire la liste complète
    const otherCats = cats.filter((c) => c.groupe_id !== groupeId)
    const updatedCats = [...otherCats, ...groupCats]
    setCats(updatedCats)
    catDragRef.current = null
    setCatDragOver(null)

    setSaving(true)
    startTransition(async () => {
      await reorderCategories(globalCatOrder(updatedCats, groupes))
      setSaving(false)
    })
  }

  function handleCatDragEnd() {
    catDragRef.current = null
    setCatDragOver(null)
  }

  // ── CRUD groupes ──────────────────────────────────────────────────────────

  function startEdit(groupe: Groupe) {
    setEditingId(groupe.id)
    setEditingNom(groupe.nom)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingNom('')
  }

  async function confirmEdit(id: string) {
    if (!editingNom.trim()) return
    startTransition(async () => {
      await updateGroupe(id, editingNom.trim())
      setGroupes((prev) => prev.map((g) => g.id === id ? { ...g, nom: editingNom.trim() } : g))
      setEditingId(null)
    })
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer le groupe "${nom}" ? Les catégories associées seront déplacées dans "Sans groupe".`)) return
    startTransition(async () => {
      await deleteGroupe(id)
      setGroupes((prev) => prev.filter((g) => g.id !== id))
      setCats((prev) => prev.map((c) => c.groupe_id === id ? { ...c, groupe_id: null } : c))
    })
  }

  async function handleCreate() {
    if (!newNom.trim()) return
    startTransition(async () => {
      const result = await createGroupe(newNom.trim())
      if (result?.groupe) {
        setGroupes((prev) => [...prev, result.groupe!])
      }
      setNewNom('')
      setShowNewInput(false)
    })
  }

  async function handleCategorieGroupe(categorieId: string, groupeId: string | null) {
    setCats((prev) => prev.map((c) => c.id === categorieId ? { ...c, groupe_id: groupeId } : c))
    startTransition(async () => {
      await updateCategorieGroupe(categorieId, groupeId)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const catsWithoutGroup = cats.filter((c) => !c.groupe_id)

  return (
    <div className="space-y-4">
      {saving && (
        <div className="px-4 py-2 bg-blue-50 text-blue-600 text-xs rounded-xl border border-blue-100">
          Enregistrement de l'ordre...
        </div>
      )}

      {/* Liste des groupes */}
      <div className="bg-white rounded-card shadow-card overflow-hidden divide-y divide-gray-50">
        {groupes.map((groupe, gIndex) => {
          const groupCats = cats.filter((c) => c.groupe_id === groupe.id)
          return (
            <div
              key={groupe.id}
              onDragOver={(e) => handleGroupeDragOver(e, gIndex)}
              onDrop={(e) => handleGroupeDrop(e, gIndex)}
              onDragEnd={handleGroupeDragEnd}
              className={`transition-colors ${groupeDragOverIndex === gIndex ? 'bg-blue-50 ring-2 ring-inset ring-accent-blue' : ''}`}
            >
              {/* En-tête du groupe */}
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-light">
                <div
                  draggable
                  onDragStart={() => handleGroupeDragStart(gIndex)}
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {editingId === groupe.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={editingNom}
                      onChange={(e) => setEditingNom(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEdit(groupe.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1 text-sm font-semibold text-navy px-2 py-1 border border-accent-blue/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    />
                    <button type="button" onClick={() => confirmEdit(groupe.id)} className="text-green-500 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className="flex-1 text-sm font-semibold text-navy cursor-pointer hover:text-accent-blue transition-colors"
                      onClick={() => startEdit(groupe)}
                      title="Cliquer pour renommer"
                    >
                      {groupe.nom}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(groupe.id, groupe.nom)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Catégories de ce groupe — draggables */}
              <div className="px-4 py-2 space-y-0.5">
                {groupCats.map((cat, cIndex) => {
                  const isOver = catDragOver?.groupeId === groupe.id && catDragOver.index === cIndex
                  return (
                    <div
                      key={cat.id}
                      onDragOver={(e) => handleCatDragOver(e, groupe.id, cIndex)}
                      onDrop={(e) => handleCatDrop(e, groupe.id, cIndex)}
                      onDragEnd={handleCatDragEnd}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${isOver ? 'bg-blue-50 ring-1 ring-accent-blue/40' : 'hover:bg-gray-50'}`}
                    >
                      <div
                        draggable
                        onDragStart={() => handleCatDragStart(groupe.id, cIndex)}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm text-gray-600 flex-1">{cat.nom}</span>
                      <button
                        type="button"
                        onClick={() => handleCategorieGroupe(cat.id, null)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Retirer du groupe"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
                {groupCats.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-1 px-2">Aucune catégorie dans ce groupe</p>
                )}
              </div>
            </div>
          )
        })}

        {groupes.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Aucun groupe défini. Créez-en un ci-dessous.
          </div>
        )}
      </div>

      {/* Catégories sans groupe → à assigner */}
      {catsWithoutGroup.length > 0 && (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-500">Sans groupe ({catsWithoutGroup.length})</p>
          </div>
          <div className="px-6 py-2 space-y-1">
            {catsWithoutGroup.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-1.5 gap-3">
                <span className="text-sm text-gray-600 flex-1">{cat.nom}</span>
                {groupes.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) handleCategorieGroupe(cat.id, e.target.value) }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  >
                    <option value="">Assigner à un groupe…</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>{g.nom}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter un groupe */}
      <div>
        {showNewInput ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowNewInput(false); setNewNom('') }
              }}
              placeholder="Nom du groupe…"
              className="flex-1 text-sm px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navy-dark transition-colors"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => { setShowNewInput(false); setNewNom('') }}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewInput(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent-blue border border-accent-blue/30 rounded-xl hover:bg-accent-blue/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un groupe
          </button>
        )}
      </div>
    </div>
  )
}
