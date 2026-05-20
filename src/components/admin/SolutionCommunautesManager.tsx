'use client'

import { useEffect, useState, useTransition } from 'react'
import { MessagesSquare, Plus, Trash2, Loader2, Pencil, ExternalLink } from 'lucide-react'
import {
  listCommunautesBySolution,
  createCommunauteAdmin,
  updateCommunaute,
  deleteSolutionCommunaute,
  type CommunauteForManager,
} from '@/lib/actions/solution-communautes'

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'forum', label: 'Forum' },
  { value: 'autre', label: 'Autre' },
]

function typeLabel(value: string): string {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default function SolutionCommunautesManager({ solutionId }: { solutionId: string }) {
  const [communautes, setCommunautes] = useState<CommunauteForManager[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Champs de formulaire — partagés entre création et édition
  const [type, setType] = useState('whatsapp')
  const [nom, setNom] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setCommunautes(await listCommunautesBySolution(solutionId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionId])

  const approuvees = communautes.filter((c) => c.statut === 'approuve')
  const enAttente = communautes.filter((c) => c.statut === 'en_attente').length

  const resetForm = () => {
    setType('whatsapp'); setNom(''); setUrl(''); setDescription(''); setError(null)
  }
  const startAdd = () => { resetForm(); setEditingId(null); setAdding(true) }
  const cancelForm = () => { resetForm(); setAdding(false); setEditingId(null) }
  const startEdit = (c: CommunauteForManager) => {
    setAdding(false)
    setEditingId(c.id)
    setType(c.type); setNom(c.nom); setUrl(c.url); setDescription(c.description ?? ''); setError(null)
  }

  const handleCreate = () => {
    setBusy(true); setError(null)
    startTransition(async () => {
      const res = await createCommunauteAdmin({ solutionId, type, nom, url, description })
      setBusy(false)
      if ('error' in res) { setError(res.error); return }
      cancelForm()
      await load()
    })
  }

  const handleUpdate = () => {
    if (!editingId) return
    setBusy(true); setError(null)
    startTransition(async () => {
      const res = await updateCommunaute(editingId, { type, nom, url, description })
      setBusy(false)
      if ('error' in res) { setError(res.error); return }
      cancelForm()
      await load()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette communauté ?')) return
    startTransition(async () => {
      await deleteSolutionCommunaute(id)
      await load()
    })
  }

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 bg-white"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            Nom <span className="text-gray-400 font-normal">(facultatif)</span>
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex. : Groupe WhatsApp des utilisateurs"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">
          Description <span className="text-gray-400 font-normal">(facultatif)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex. : Groupe d'entraide animé par des utilisateurs"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={cancelForm} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-navy">Communautés</h2>
          {!loading && approuvees.length > 0 && (
            <span className="text-xs text-gray-400">({approuvees.length})</span>
          )}
        </div>
        {!adding && !editingId && (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {adding && renderForm(handleCreate, 'Ajouter la communauté')}

      {/* Liste des communautés approuvées */}
      {loading ? (
        <p className="px-6 py-6 text-sm text-gray-400">Chargement…</p>
      ) : approuvees.length === 0 && !adding ? (
        <p className="px-6 py-6 text-sm text-gray-400">Aucune communauté pour cette solution.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {approuvees.map((c) => (
            editingId === c.id ? (
              <li key={c.id}>{renderForm(handleUpdate, 'Enregistrer')}</li>
            ) : (
              <li key={c.id} className="px-6 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
                    {c.nom}
                    <span className="ml-2 text-xs font-normal text-accent-blue">{typeLabel(c.type)}</span>
                  </p>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-accent-blue inline-flex items-center gap-1 max-w-full truncate"
                  >
                    <span className="truncate">{c.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  {c.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="text-gray-400 hover:text-accent-blue p-1.5 rounded-lg hover:bg-accent-blue/5 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            )
          ))}
        </ul>
      )}

      {/* Propositions en attente — renvoi vers la file de modération */}
      {!loading && enAttente > 0 && (
        <a
          href="/admin/communautes"
          className="block px-6 py-3 border-t border-gray-100 text-xs text-amber-700 bg-amber-50/50 hover:bg-amber-50 transition-colors"
        >
          {enAttente} proposition{enAttente > 1 ? 's' : ''} en attente pour cette solution — modérer
        </a>
      )}
    </div>
  )
}
