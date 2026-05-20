'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, X, RotateCcw, Trash2, ExternalLink, MessageCircle, MessageSquare, Hash, Facebook, Globe, Users } from 'lucide-react'
import { setStatutCommunaute, deleteSolutionCommunaute, type AdminCommunaute } from '@/lib/actions/solution-communautes'

const TYPE_META: Record<string, { label: string; Icon: typeof MessageCircle; color: string }> = {
  whatsapp:  { label: 'WhatsApp',  Icon: MessageCircle, color: 'text-green-600 bg-green-50' },
  telegram:  { label: 'Telegram',  Icon: MessageSquare, color: 'text-sky-600 bg-sky-50' },
  discord:   { label: 'Discord',   Icon: Hash,          color: 'text-indigo-600 bg-indigo-50' },
  facebook:  { label: 'Facebook',  Icon: Facebook,      color: 'text-blue-600 bg-blue-50' },
  forum:     { label: 'Forum',     Icon: Globe,         color: 'text-amber-600 bg-amber-50' },
  autre:     { label: 'Autre',     Icon: Globe,         color: 'text-gray-600 bg-gray-50' },
}

const STATUT_OPTIONS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'tous', label: 'Toutes' },
  { value: 'approuve', label: 'Approuvées' },
  { value: 'refuse', label: 'Refusées' },
] as const

const TYPE_FILTER_OPTIONS = [
  { value: 'tous', label: 'Tous types' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'forum', label: 'Forum' },
  { value: 'autre', label: 'Autre' },
] as const

function proposerLabel(c: AdminCommunaute): { label: string; email: string | null } {
  if (c.proposer) {
    const label = c.proposer.pseudo
      || `${c.proposer.prenom ?? ''} ${c.proposer.nom ?? ''}`.trim()
      || c.proposer.contact_email
      || c.proposer.email
      || 'Utilisateur'
    return { label, email: c.proposer.contact_email || c.proposer.email || null }
  }
  if (c.proposer_email) return { label: 'Visiteur anonyme', email: c.proposer_email }
  return { label: 'Visiteur anonyme', email: null }
}

export default function CommunautesAdminClient({ communautes }: { communautes: AdminCommunaute[] }) {
  const [items, setItems] = useState(communautes)
  const [statutFilter, setStatutFilter] = useState<'en_attente' | 'tous' | 'approuve' | 'refuse'>('en_attente')
  const [typeFilter, setTypeFilter] = useState<'tous' | 'whatsapp' | 'telegram' | 'discord' | 'facebook' | 'forum' | 'autre'>('tous')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (statutFilter !== 'tous' && c.statut !== statutFilter) return false
      if (typeFilter !== 'tous' && c.type !== typeFilter) return false
      return true
    })
  }, [items, statutFilter, typeFilter])

  const handleSetStatut = (id: string, statut: 'en_attente' | 'approuve' | 'refuse') => {
    setBusyId(id)
    startTransition(async () => {
      const res = await setStatutCommunaute(id, statut)
      if (!('error' in res)) {
        setItems((prev) => prev.map((c) => c.id === id ? { ...c, statut, approved_at: statut === 'approuve' ? new Date().toISOString() : c.approved_at } : c))
      }
      setBusyId(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement cette proposition ?')) return
    setBusyId(id)
    startTransition(async () => {
      const res = await deleteSolutionCommunaute(id)
      if (!('error' in res)) setItems((prev) => prev.filter((c) => c.id !== id))
      setBusyId(null)
    })
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex flex-wrap gap-1">
          {STATUT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatutFilter(o.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                statutFilter === o.value
                  ? 'bg-navy text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        >
          {TYPE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} proposition{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucune proposition pour ces filtres.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const meta = TYPE_META[c.type] ?? TYPE_META.autre
            const Icon = meta.Icon
            const isBusy = busyId === c.id
            const prop = proposerLabel(c)
            const solHref = c.solution?.categorie?.slug && c.solution?.slug
              ? `/solutions/${c.solution.categorie.slug}/${c.solution.slug}`
              : null
            return (
              <div key={c.id} className="bg-white rounded-card shadow-card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy">{c.nom}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.statut === 'en_attente' ? 'bg-amber-100 text-amber-700'
                      : c.statut === 'approuve' ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {c.statut === 'en_attente' ? 'En attente' : c.statut === 'approuve' ? 'Approuvée' : 'Refusée'}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{c.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
                    <span><strong className="text-gray-600">{meta.label}</strong></span>
                    {c.solution && (
                      <span>·{' '}
                        {solHref ? <Link href={solHref} className="text-accent-blue hover:underline">{c.solution.nom}</Link> : c.solution.nom}
                        {c.solution.categorie?.nom ? <> <span className="text-gray-300">({c.solution.categorie.nom})</span></> : null}
                      </span>
                    )}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline truncate max-w-xs inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {c.url}
                    </a>
                    <span>· Proposé par{' '}
                      <strong className="text-gray-600">{prop.label}</strong>
                      {prop.email && <> (<a href={`mailto:${prop.email}`} className="text-accent-blue hover:underline">{prop.email}</a>)</>}
                    </span>
                    <span>· {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.statut !== 'approuve' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetStatut(c.id, 'approuve')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Approuver"
                    >
                      <Check className="w-3.5 h-3.5" /> Approuver
                    </button>
                  )}
                  {c.statut !== 'refuse' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetStatut(c.id, 'refuse')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Refuser"
                    >
                      <X className="w-3.5 h-3.5" /> Refuser
                    </button>
                  )}
                  {c.statut !== 'en_attente' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetStatut(c.id, 'en_attente')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Remettre en attente"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(c.id)}
                    className="inline-flex items-center gap-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
