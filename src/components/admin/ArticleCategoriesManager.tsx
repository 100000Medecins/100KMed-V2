'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { createArticleCategorie, updateArticleCategorie, deleteArticleCategorie } from '@/lib/actions/admin'

type Cat = { id: string; nom: string; slug: string; position: number }

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function ArticleCategoriesManager({ initialCategories }: { initialCategories: Cat[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [newNom, setNewNom] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEdit(cat: Cat) {
    setEditingId(cat.id)
    setEditNom(cat.nom)
    setEditSlug(cat.slug)
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateArticleCategorie(id, editNom, editSlug)
      if (result?.error) { setError(result.error); return }
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, nom: editNom, slug: editSlug } : c))
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteArticleCategorie(id)
      if (result?.error) { setError(result.error); return }
      setCategories((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleCreate() {
    if (!newNom.trim()) return
    startTransition(async () => {
      const result = await createArticleCategorie(newNom.trim(), slugify(newNom.trim()))
      if (result?.error) { setError(result.error); return }
      setNewNom('')
      setShowNew(false)
      // Reload via revalidation — page will update
      window.location.reload()
    })
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {error && <div className="px-6 py-3 bg-red-50 text-red-600 text-sm">{error}</div>}

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Slug</th>
            <th className="text-right px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {categories.map((cat) => (
            <tr key={cat.id} className="hover:bg-surface-light transition-colors">
              <td className="px-6 py-3">
                {editingId === cat.id ? (
                  <input
                    value={editNom}
                    onChange={(e) => { setEditNom(e.target.value); setEditSlug(slugify(e.target.value)) }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm font-medium text-navy">{cat.nom}</span>
                )}
              </td>
              <td className="px-6 py-3 hidden sm:table-cell">
                {editingId === cat.id ? (
                  <input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                ) : (
                  <span className="text-xs font-mono text-gray-400">{cat.slug}</span>
                )}
              </td>
              <td className="px-6 py-3 text-right">
                {editingId === cat.id ? (
                  <span className="inline-flex items-center gap-1">
                    <button onClick={() => saveEdit(cat.id)} disabled={isPending} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} disabled={isPending} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}

          {/* Nouvelle catégorie */}
          {showNew && (
            <tr className="bg-accent-blue/5">
              <td className="px-6 py-3">
                <input
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false) }}
                  placeholder="Nom de la catégorie"
                  className="w-full text-sm border border-accent-blue/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  autoFocus
                />
              </td>
              <td className="px-6 py-3 hidden sm:table-cell">
                <span className="text-xs font-mono text-gray-400">{slugify(newNom)}</span>
              </td>
              <td className="px-6 py-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <button onClick={handleCreate} disabled={isPending || !newNom.trim()} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setShowNew(false); setNewNom('') }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="px-6 py-4 border-t border-gray-50">
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 text-sm text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une catégorie
        </button>
      </div>
    </div>
  )
}
