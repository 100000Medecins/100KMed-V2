'use client'

import { useState, useTransition, useMemo } from 'react'
import { Lightbulb, AlertTriangle, Check, X, RotateCcw, Trash2, ExternalLink, Inbox } from 'lucide-react'
import { setPropositionStatut, deleteProposition } from '@/lib/actions/propositions'
import type { AdminProposition } from '@/app/admin/propositions/page'

const TYPE_LABEL: Record<AdminProposition['type'], string> = { idee: 'Idée', correction: 'Correction' }
const TYPE_ICON: Record<AdminProposition['type'], typeof Lightbulb> = {
  idee: Lightbulb,
  correction: AlertTriangle,
}
const TYPE_COLOR: Record<AdminProposition['type'], string> = {
  idee: 'text-amber-500 bg-amber-50',
  correction: 'text-orange-500 bg-orange-50',
}

const STATUT_LABEL: Record<AdminProposition['statut'], string> = {
  en_attente: 'En attente',
  traite: 'Traitée',
  refuse: 'Refusée',
}
const STATUT_COLOR: Record<AdminProposition['statut'], string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  traite: 'bg-green-100 text-green-700',
  refuse: 'bg-gray-100 text-gray-500',
}

function proposerLabel(p: AdminProposition['proposer']): string {
  if (!p) return 'Utilisateur supprimé'
  if (p.pseudo) return p.pseudo
  if (p.prenom || p.nom) return `${p.prenom ?? ''} ${p.nom ?? ''}`.trim()
  return p.email ?? 'Anonyme'
}

function buildExternalUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) {
    if (typeof window !== 'undefined') return window.location.origin + url
    return url
  }
  return url
}

export default function PropositionsAdminClient({ propositions: initial }: { propositions: AdminProposition[] }) {
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState<'en_attente' | 'tous' | 'traite' | 'refuse'>('en_attente')
  const [typeFilter, setTypeFilter] = useState<'tous' | 'idee' | 'correction'>('tous')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const counts = useMemo(() => ({
    en_attente: items.filter((i) => i.statut === 'en_attente').length,
    traite: items.filter((i) => i.statut === 'traite').length,
    refuse: items.filter((i) => i.statut === 'refuse').length,
    tous: items.length,
    idee: items.filter((i) => i.type === 'idee').length,
    correction: items.filter((i) => i.type === 'correction').length,
  }), [items])

  const filtered = items.filter((i) => {
    if (filter !== 'tous' && i.statut !== filter) return false
    if (typeFilter !== 'tous' && i.type !== typeFilter) return false
    return true
  })

  const updateLocal = (id: string, patch: Partial<AdminProposition>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const handleSetStatut = (id: string, statut: AdminProposition['statut']) => {
    setBusyId(id)
    startTransition(async () => {
      const r = await setPropositionStatut(id, statut)
      if (r.ok) updateLocal(id, { statut })
      setBusyId(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement cette proposition ?')) return
    setBusyId(id)
    startTransition(async () => {
      const r = await deleteProposition(id)
      if (r.ok) setItems((prev) => prev.filter((p) => p.id !== id))
      setBusyId(null)
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Propositions utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {counts.en_attente} en attente · {counts.traite} traitée{counts.traite > 1 ? 's' : ''} · {counts.refuse} refusée{counts.refuse > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-100">
        {(['en_attente', 'tous', 'traite', 'refuse'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              filter === s
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
            }`}
          >
            {s === 'en_attente' && 'En attente'}
            {s === 'traite' && 'Traitées'}
            {s === 'refuse' && 'Refusées'}
            {s === 'tous' && 'Toutes'}
            <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Filtre type */}
      <div className="flex gap-2 mb-6">
        {(['tous', 'idee', 'correction'] as const).map((t) => {
          const Icon = t === 'tous' ? Inbox : TYPE_ICON[t]
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === t
                  ? 'bg-navy text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-navy hover:text-navy'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t === 'tous' ? 'Tous types' : TYPE_LABEL[t]}
              <span className="text-[10px] opacity-75">({counts[t]})</span>
            </button>
          )
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-12 text-center text-sm text-gray-400">
          Aucune proposition dans cette vue.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const Icon = TYPE_ICON[p.type]
            const isBusy = busyId === p.id
            return (
              <div key={p.id} className="bg-white rounded-card shadow-card p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLOR[p.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {TYPE_LABEL[p.type]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUT_COLOR[p.statut]}`}>
                        {STATUT_LABEL[p.statut]}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-navy text-base">{p.titre}</h3>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{p.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                      <span>par <strong className="text-gray-700">{proposerLabel(p.proposer)}</strong></span>
                      {p.proposer?.email && (
                        <a href={`mailto:${p.proposer.email}`} className="text-accent-blue hover:underline">{p.proposer.email}</a>
                      )}
                      {p.url_concernee && (
                        <a
                          href={buildExternalUrl(p.url_concernee)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent-blue hover:underline truncate max-w-md"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {p.url_concernee}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.statut === 'en_attente' ? (
                      <>
                        <button
                          onClick={() => handleSetStatut(p.id, 'traite')}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Traiter
                        </button>
                        <button
                          onClick={() => handleSetStatut(p.id, 'refuse')}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSetStatut(p.id, 'en_attente')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Remettre en attente
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isBusy}
                      title="Supprimer"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
