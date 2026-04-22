'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { reorderPartenaires, deletePartenaire, togglePartenaireActif } from '@/lib/actions/admin'

type Partenaire = { id: string; nom: string; logo_url: string | null; lien_url: string | null; actif: boolean | null; position: number | null }

function ToggleActif({ id, actif }: { id: string; actif: boolean }) {
  const [localActif, setLocalActif] = useState(actif)
  const [, startTransition] = useTransition()

  function handleToggle() {
    const newValue = !localActif
    setLocalActif(newValue)
    startTransition(async () => {
      await togglePartenaireActif(id, newValue)
    })
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 ${
        localActif ? 'bg-green-500' : 'bg-gray-300'
      }`}
      title={localActif ? 'Désactiver' : 'Activer'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          localActif ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function PartenairesList({ initialPartenaires }: { initialPartenaires: Partenaire[] }) {
  const [partenaires, setPartenaires] = useState(initialPartenaires)
  const [saving, setSaving] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  function handleDragStart(index: number) { dragIndexRef.current = index }
  function handleDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setDragOverIndex(index) }
  function handleDragEnd() { dragIndexRef.current = null; setDragOverIndex(null) }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) { setDragOverIndex(null); return }
    const updated = [...partenaires]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setPartenaires(updated)
    dragIndexRef.current = null
    setDragOverIndex(null)
    setSaving(true)
    startTransition(async () => {
      await reorderPartenaires(updated.map((p) => p.id))
      setSaving(false)
    })
  }

  function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    startTransition(async () => {
      await deletePartenaire(id)
      setPartenaires((prev) => prev.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {saving && <div className="px-6 py-2 bg-blue-50 text-blue-600 text-xs border-b border-blue-100">Enregistrement de l'ordre...</div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-4 w-8" />
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Lien</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {partenaires.map((p, index) => (
              <tr key={p.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-colors ${dragOverIndex === index ? 'bg-blue-50 ring-2 ring-inset ring-accent-blue' : 'hover:bg-surface-light'}`}
              >
                <td className="px-4 py-4">
                  <div draggable onDragStart={() => handleDragStart(index)}
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" title="Glisser pour réordonner">
                    <GripVertical className="w-5 h-5" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  {p.logo_url
                    ? <img src={p.logo_url} alt={p.nom} className="h-8 max-w-[80px] object-contain" />
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-6 py-4 font-medium text-navy text-sm">{p.nom}</td>
                <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                  {p.lien_url ? <a href={p.lien_url} target="_blank" rel="noopener" className="text-accent-blue hover:underline">{p.lien_url}</a> : '—'}
                </td>
                <td className="px-6 py-4">
                  <ToggleActif id={p.id} actif={p.actif ?? false} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/partenaires/${p.id}/modifier`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs">
                      Éditer <Pencil className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(p.id, p.nom)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {partenaires.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">Aucun partenaire pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
