'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Send, Check, Loader2 } from 'lucide-react'
import { submitSolutionCommunaute } from '@/lib/actions/solution-communautes'

const TYPE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'forum', label: 'Forum' },
  { value: 'autre', label: 'Autre' },
]

export default function ProposeCommunauteModal({
  open,
  onClose,
  solutionId,
  solutionNom,
  userEmail,
}: {
  open: boolean
  onClose: () => void
  solutionId: string
  solutionNom: string
  userEmail: string | null
}) {
  const [type, setType] = useState('whatsapp')
  const [nom, setNom] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [notify, setNotify] = useState(true)
  const [proposerEmail, setProposerEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Reset state quand on rouvre la modale
  useEffect(() => {
    if (open) {
      setType('whatsapp')
      setNom('')
      setUrl('')
      setDescription('')
      setProposerEmail('')
      setNotify(true)
      setDone(false)
      setError(null)
    }
  }, [open])

  // Escape pour fermer
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await submitSolutionCommunaute({
        solutionId,
        type,
        nom: nom.trim(),
        url: url.trim(),
        description: description.trim() || null,
        proposerEmail: userEmail ? null : (proposerEmail.trim() || null),
      })
      if (res.status === 'ERROR') setError(res.message)
      else setDone(true)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-card shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-navy">Proposer un groupe</h3>
            <p className="text-xs text-gray-500 mt-0.5">pour {solutionNom}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Proposition envoyée, merci !</p>
            <p className="text-xs text-gray-400">Elle sera examinée par notre équipe avant publication.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 px-4 py-2 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 bg-white"
                >
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom du groupe <span className="text-gray-400 font-normal">(facultatif)</span></label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Utilisateurs Weda libéraux"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Description <span className="text-gray-400 font-normal">(facultatif)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="En une phrase, qui est ce groupe ?"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-y min-h-[56px]"
              />
            </div>

            {userEmail ? (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent-blue"
                />
                <span className="text-xs text-gray-500">
                  M&apos;envoyer un email lors de la publication <span className="text-gray-400">({userEmail})</span>
                </span>
              </label>
            ) : (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email <span className="text-gray-400 font-normal">(facultatif, pour être informé de la publication)</span></label>
                <input
                  type="email"
                  value={proposerEmail}
                  onChange={(e) => setProposerEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isPending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
