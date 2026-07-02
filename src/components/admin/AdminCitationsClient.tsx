'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Pencil, Trash2, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { CitationAdmin } from '@/lib/db/citations'
import {
  createCitation,
  updateCitation,
  setStatutCitation,
  deleteCitation,
} from '@/lib/actions/citations'

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-4 py-2.5'

type Filtre = 'a_moderer' | 'publiee' | 'refusee' | 'toutes'

const STATUT_BADGE: Record<CitationAdmin['statut'], { variant: 'warning' | 'success' | 'neutral'; label: string }> = {
  en_attente: { variant: 'warning', label: 'À modérer' },
  publiee: { variant: 'success', label: 'Publiée' },
  refusee: { variant: 'neutral', label: 'Refusée' },
}

export default function AdminCitationsClient({ citations }: { citations: CitationAdmin[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filtre, setFiltre] = useState<Filtre>('a_moderer')

  // Ajout
  const [newText, setNewText] = useState('')
  const [newAuteur, setNewAuteur] = useState('')

  // Édition inline
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editAuteur, setEditAuteur] = useState('')

  const counts = useMemo(() => ({
    a_moderer: citations.filter((c) => c.statut === 'en_attente').length,
    publiee: citations.filter((c) => c.statut === 'publiee').length,
    refusee: citations.filter((c) => c.statut === 'refusee').length,
    toutes: citations.length,
  }), [citations])

  const filtered = citations.filter((c) =>
    filtre === 'toutes' ? true
      : filtre === 'a_moderer' ? c.statut === 'en_attente'
      : c.statut === filtre,
  )

  const run = (fn: () => Promise<{ error?: string } | { ok: true }>) => {
    startTransition(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) { window.alert(res.error); return }
      router.refresh()
    })
  }

  const handleAdd = () => {
    if (!newText.trim()) return
    run(async () => {
      const res = await createCitation({ text: newText, auteur: newAuteur })
      if (!('error' in res)) { setNewText(''); setNewAuteur('') }
      return res
    })
  }

  const startEdit = (c: CitationAdmin) => {
    setEditId(c.id); setEditText(c.text); setEditAuteur(c.auteur ?? '')
  }
  const saveEdit = () => {
    if (!editId) return
    const id = editId
    run(async () => {
      const res = await updateCitation(id, { text: editText, auteur: editAuteur })
      if (!('error' in res)) setEditId(null)
      return res
    })
  }

  const FILTRES: { key: Filtre; label: string }[] = [
    { key: 'a_moderer', label: `À modérer (${counts.a_moderer})` },
    { key: 'publiee', label: `Publiées (${counts.publiee})` },
    { key: 'refusee', label: `Refusées (${counts.refusee})` },
    { key: 'toutes', label: `Toutes (${counts.toutes})` },
  ]

  return (
    <div className="space-y-6">
      {/* Ajout d'une citation (publiée directement) */}
      <div className="bg-white rounded-card shadow-card p-5">
        <h2 className="text-sm font-semibold text-navy mb-3">Ajouter une citation</h2>
        <div className="space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            className={inputClass + ' resize-y'}
            placeholder="Texte de la citation…"
            maxLength={1000}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newAuteur}
              onChange={(e) => setNewAuteur(e.target.value)}
              className={inputClass + ' sm:flex-1'}
              placeholder="Auteur (facultatif)"
              maxLength={200}
            />
            <Button onClick={handleAdd} loading={isPending} leftIcon={<Plus className="w-4 h-4" />} disabled={!newText.trim()}>
              Ajouter (publiée)
            </Button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltre(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              filtre === f.key
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
        {filtered.length === 0 && (
          <p className="px-6 py-12 text-center text-gray-400 text-sm">Aucune citation dans ce filtre.</p>
        )}
        {filtered.map((c) => {
          const badge = STATUT_BADGE[c.statut]
          const isEditing = editId === c.id
          return (
            <div key={c.id} className="px-5 py-4">
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className={inputClass + ' resize-y'}
                    maxLength={1000}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={editAuteur}
                      onChange={(e) => setEditAuteur(e.target.value)}
                      className={inputClass + ' sm:flex-1'}
                      placeholder="Auteur (facultatif)"
                      maxLength={200}
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} loading={isPending} size="sm">Enregistrer</Button>
                      <Button onClick={() => setEditId(null)} variant="outline" size="sm">Annuler</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                      {c.propose_par && (
                        <span className="text-[11px] text-gray-400">proposée par un médecin</span>
                      )}
                    </div>
                    <p className="text-sm text-navy/90 italic">« {c.text} »</p>
                    {c.auteur && <p className="text-xs text-gray-500 mt-0.5">— {c.auteur}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.statut !== 'publiee' && (
                      <button
                        type="button"
                        onClick={() => run(() => setStatutCitation(c.id, 'publiee'))}
                        title="Publier"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {c.statut !== 'refusee' && (
                      <button
                        type="button"
                        onClick={() => run(() => setStatutCitation(c.id, 'refusee'))}
                        title="Refuser"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      title="Éditer"
                      className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (window.confirm('Supprimer définitivement cette citation ?')) run(() => deleteCitation(c.id)) }}
                      title="Supprimer"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
