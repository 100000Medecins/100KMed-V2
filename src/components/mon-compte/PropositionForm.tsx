'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { submitProposition } from '@/lib/actions/propositions'
import { CheckCircle2, AlertCircle, Lightbulb, AlertTriangle } from 'lucide-react'

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass = inputClass + ' resize-y'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'

const COPY = {
  idee: {
    icon: Lightbulb,
    intro:
      "Une idée pour améliorer la plateforme : nouvelle fonctionnalité, contenu manquant, partenariat… L'équipe lit toutes les suggestions.",
    titrePlaceholder: 'Ex: « Comparer les solutions par prix »',
    descriptionPlaceholder:
      'Décris ton idée en quelques phrases : à quel problème ça répond, à qui ça serait utile, comment tu vois ça idéalement.',
    urlLabel: 'URL associée (si pertinent)',
    urlHelp: "Optionnel — si l'idée concerne une page précise du site.",
    submit: "Envoyer l'idée",
    successTitle: 'Idée envoyée',
    successText: "Merci ! L'équipe va la lire. Tu peux en proposer d'autres.",
  },
  correction: {
    icon: AlertTriangle,
    intro:
      "Tu as repéré une coquille, un bug, une info erronée ? Signale-le ici, on corrige au plus vite.",
    titrePlaceholder: 'Ex: « Faute de frappe sur la page Doctolib »',
    descriptionPlaceholder:
      "Décris ce qui ne va pas : ce que tu as vu vs. ce qui devrait s'afficher, comment reproduire si c'est un bug.",
    urlLabel: 'URL concernée',
    urlHelp: "Pré-remplie avec la page d'où tu viens. Modifie si besoin.",
    submit: 'Envoyer la correction',
    successTitle: 'Correction envoyée',
    successText: "Merci ! L'équipe va vérifier et corriger.",
  },
} as const

export default function PropositionForm({ type }: { type: 'idee' | 'correction' }) {
  const { user, loading } = useAuth()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [urlConcernee, setUrlConcernee] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  // Pré-remplir l'URL avec le referer same-origin (sauf si on vient déjà du proposer)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const ref = document.referrer
    if (!ref) return
    try {
      const refUrl = new URL(ref)
      if (refUrl.origin !== window.location.origin) return
      const path = refUrl.pathname
      if (path.startsWith('/mon-compte/proposer')) return
      setUrlConcernee(path + refUrl.search)
    } catch { /* ignore */ }
  }, [])

  const copy = COPY[type]
  const Icon = copy.icon

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement…</div>
  }
  if (!user) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center text-sm text-gray-500">
        Vous devez être connecté pour proposer quelque chose.
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('idle')
    setErrorMessage('')
    startTransition(async () => {
      const result = await submitProposition({ type, titre, description, urlConcernee })
      if (result.status === 'SUCCESS') {
        setStatus('success')
        setTitre(''); setDescription(''); setUrlConcernee('')
      } else {
        setStatus('error')
        setErrorMessage(result.message)
      }
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6 flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${type === 'idee' ? 'text-amber-500' : 'text-orange-500'}`} />
        <span>{copy.intro}</span>
      </p>

      {status === 'success' && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">{copy.successTitle}</p>
            <p className="mt-0.5">{copy.successText}</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">Impossible d&apos;envoyer</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-card shadow-card p-6 space-y-5">
          <div>
            <label className={labelClass}>Titre <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className={inputClass}
              placeholder={copy.titrePlaceholder}
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>Description <span className="text-red-400">*</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className={textareaClass}
              placeholder={copy.descriptionPlaceholder}
              required
              maxLength={5000}
            />
          </div>

          <div>
            <label className={labelClass}>{copy.urlLabel}</label>
            <input
              type="text"
              value={urlConcernee}
              onChange={(e) => setUrlConcernee(e.target.value)}
              className={inputClass}
              placeholder="/solutions/categorie/solution ou https://…"
              maxLength={500}
            />
            <p className="text-[11px] text-gray-400 mt-1">{copy.urlHelp}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : copy.submit}
        </button>
      </form>
    </div>
  )
}
