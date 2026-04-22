'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Check, X, ExternalLink, Lightbulb } from 'lucide-react'
import { createAcronyme, updateAcronyme, deleteAcronyme, approveSuggestion, rejectSuggestion } from '@/lib/actions/admin'

type Acronyme = {
  id: string
  sigle: string
  definition: string
  description: string | null
  lien: string | null
  created_at: string
}

type Suggestion = {
  id: string
  sigle: string
  definition: string
  description: string | null
  email: string | null
  created_at: string
}

type FormState = {
  sigle: string
  definition: string
  description: string
  lien: string
}

const emptyForm: FormState = { sigle: '', definition: '', description: '', lien: '' }

function AcronymeForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial: FormState
  onSave: (f: FormState) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="grid grid-cols-1 gap-3 p-4 bg-accent-blue/5 rounded-xl border border-accent-blue/20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Sigle *</label>
          <input
            value={form.sigle}
            onChange={set('sigle')}
            placeholder="ex. DMP"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Définition *</label>
          <input
            value={form.definition}
            onChange={set('definition')}
            placeholder="ex. Dossier Médical Partagé"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Lien externe</label>
        <input
          value={form.lien}
          onChange={set('lien')}
          placeholder="https://…"
          type="url"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
        <textarea
          value={form.description}
          onChange={set('description')}
          placeholder="Explication plus détaillée…"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
        <button
          type="button"
          disabled={isPending || !form.sigle.trim() || !form.definition.trim()}
          onClick={() => onSave(form)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> {isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

export default function AcronymesAdminClient({ initialAcronymes, initialSuggestions }: { initialAcronymes: Acronyme[]; initialSuggestions: Suggestion[] }) {
  const [tab, setTab] = useState<'acronymes' | 'suggestions'>('acronymes')
  const [acronymes, setAcronymes] = useState(initialAcronymes)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveForm, setApproveForm] = useState<FormState>(emptyForm)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = acronymes.filter(a =>
    a.sigle.toLowerCase().includes(search.toLowerCase()) ||
    a.definition.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreate(form: FormState) {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, v))
    startTransition(async () => {
      await createAcronyme(fd)
      setAcronymes(prev => [...prev, {
        id: 'tmp-' + Date.now(),
        sigle: form.sigle.toUpperCase(),
        definition: form.definition,
        description: form.description || null,
        lien: form.lien || null,
        created_at: new Date().toISOString(),
      }].sort((a, b) => a.sigle.localeCompare(b.sigle)))
      setShowAdd(false)
    })
  }

  function handleUpdate(id: string, form: FormState) {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, v))
    startTransition(async () => {
      await updateAcronyme(id, fd)
      setAcronymes(prev => prev.map(a => a.id === id ? {
        ...a,
        sigle: form.sigle.toUpperCase(),
        definition: form.definition,
        description: form.description || null,
        lien: form.lien || null,
      } : a).sort((a, b) => a.sigle.localeCompare(b.sigle)))
      setEditId(null)
    })
  }

  function handleDelete(id: string, sigle: string) {
    if (!confirm(`Supprimer "${sigle}" ?`)) return
    startTransition(async () => {
      await deleteAcronyme(id)
      setAcronymes(prev => prev.filter(a => a.id !== id))
    })
  }

  function handleStartApprove(s: Suggestion) {
    setApprovingId(s.id)
    setApproveForm({ sigle: s.sigle, definition: s.definition, description: s.description ?? '', lien: '' })
  }

  function handleApprove(form: FormState) {
    if (!approvingId) return
    const id = approvingId
    startTransition(async () => {
      await approveSuggestion(id, {
        sigle: form.sigle,
        definition: form.definition,
        description: form.description || null,
      })
      setSuggestions(prev => prev.filter(s => s.id !== id))
      setAcronymes(prev => [...prev, {
        id: 'tmp-' + Date.now(),
        sigle: form.sigle.toUpperCase(),
        definition: form.definition,
        description: form.description || null,
        lien: null,
        created_at: new Date().toISOString(),
      }].sort((a, b) => a.sigle.localeCompare(b.sigle)))
      setApprovingId(null)
      setTab('acronymes')
    })
  }

  function handleReject(id: string, sigle: string) {
    if (!confirm(`Rejeter la proposition "${sigle}" ?`)) return
    startTransition(async () => {
      await rejectSuggestion(id)
      setSuggestions(prev => prev.filter(s => s.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('acronymes')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === 'acronymes' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Acronymes
        </button>
        <button
          onClick={() => setTab('suggestions')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${tab === 'suggestions' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Propositions
          {suggestions.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-accent-blue text-white rounded-full">{suggestions.length}</span>
          )}
        </button>
      </div>

      {/* Vue Propositions */}
      {tab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-card shadow-card px-6 py-16 text-center text-gray-400 text-sm">
              Aucune proposition pour l&apos;instant.
            </div>
          ) : suggestions.map(s => (
            <div key={s.id} className="bg-white rounded-card shadow-card overflow-hidden">
              {approvingId === s.id ? (
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400 mb-3">Modifier avant publication :</p>
                  <AcronymeForm
                    initial={approveForm}
                    onSave={handleApprove}
                    onCancel={() => setApprovingId(null)}
                    isPending={isPending}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-navy">{s.sigle}</span>
                      {s.email && <span className="text-xs text-gray-400">· {s.email}</span>}
                      <span className="text-xs text-gray-300">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-700">{s.definition}</p>
                    {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartApprove(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approuver
                    </button>
                    <button
                      onClick={() => handleReject(s.id, s.sigle)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vue Acronymes */}
      {tab === 'acronymes' && <>
      {/* Barre actions */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un sigle ou une définition…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        />
        <button
          onClick={() => { setShowAdd(true); setEditId(null) }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-dark transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {showAdd && (
        <AcronymeForm
          initial={emptyForm}
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
          isPending={isPending}
        />
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card px-6 py-16 text-center text-gray-400 text-sm">
          {search ? 'Aucun résultat.' : 'Aucun acronyme. Cliquez sur "Ajouter" pour commencer.'}
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card overflow-hidden divide-y divide-gray-50">
          {filtered.map(a => (
            <div key={a.id}>
              {editId === a.id ? (
                <div className="px-5 py-3">
                  <AcronymeForm
                    initial={{ sigle: a.sigle, definition: a.definition, description: a.description ?? '', lien: a.lien ?? '' }}
                    onSave={(f) => handleUpdate(a.id, f)}
                    onCancel={() => setEditId(null)}
                    isPending={isPending}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-4 px-5 py-3 hover:bg-surface-light transition-colors group">
                  <span className="text-sm font-bold text-navy w-24 shrink-0 pt-0.5">{a.sigle}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{a.definition}</p>
                    {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                    {a.lien && (
                      <a href={a.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-0.5">
                        <ExternalLink className="w-3 h-3" /> {a.lien}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(a.id); setShowAdd(false) }} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a.id, a.sigle)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  )
}
