'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { GripVertical, Pencil } from 'lucide-react'
import { reorderCategories } from '@/lib/actions/admin'
import DeleteCategorieButton from './DeleteCategorieButton'
import ToggleCategorieActif from './ToggleCategorieActif'

type Categorie = {
  id: string
  nom: string
  intro: string | null
  actif: boolean | null
  position: number | null
}

export default function CategoriesList({ initialCategories }: { initialCategories: Categorie[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [saving, setSaving] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [, startTransition] = useTransition()

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
    if (dragIndex === null || dragIndex === dropIndex) { setDragOverIndex(null); return }
    const updated = [...categories]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setCategories(updated)
    dragIndexRef.current = null
    setDragOverIndex(null)

    // Sauvegarder l'ordre en base
    setSaving(true)
    startTransition(async () => {
      await reorderCategories(updated.map((c) => c.id))
      setSaving(false)
    })
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {saving && (
        <div className="px-6 py-2 bg-blue-50 text-blue-600 text-xs border-b border-blue-100">
          Enregistrement de l'ordre...
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-4 w-8" />
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Intro
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((cat, index) => (
              <tr
                key={cat.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-colors ${dragOverIndex === index ? 'bg-blue-50 ring-2 ring-inset ring-accent-blue' : 'hover:bg-surface-light'}`}
              >
                <td className="px-4 py-4">
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                    title="Glisser pour réordonner"
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-navy text-sm">{cat.nom}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                  {cat.intro ? <span dangerouslySetInnerHTML={{ __html: cat.intro }} className="line-clamp-1" /> : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <ToggleCategorieActif categorieId={cat.id} actif={cat.actif ?? false} />
                    <span className={`text-xs font-medium ${cat.actif ? 'text-green-700' : 'text-gray-400'}`}>
                      {cat.actif ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/categories/${cat.id}/modifier`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                      title="Modifier"
                    >
                      Éditer
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <DeleteCategorieButton categorieId={cat.id} nom={cat.nom} />
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                  Aucune catégorie pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
