'use client'

import { useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { proposerCitation } from '@/lib/actions/citations'
import { CheckCircle2, AlertCircle, Quote } from 'lucide-react'
import Button from '@/components/ui/Button'

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass = inputClass + ' resize-y'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'

export default function CitationProposeForm() {
  const { user, loading } = useAuth()
  const [text, setText] = useState('')
  const [auteur, setAuteur] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement…</div>
  }
  if (!user) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center text-sm text-gray-500">
        Vous devez être connecté pour proposer une citation.
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('idle')
    setErrorMessage('')
    startTransition(async () => {
      const result = await proposerCitation({ text, auteur })
      if (result.status === 'SUCCESS') {
        setStatus('success')
        setText(''); setAuteur('')
      } else {
        setStatus('error')
        setErrorMessage(result.message)
      }
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6 flex items-start gap-2">
        <Quote className="w-4 h-4 mt-0.5 shrink-0 text-accent-blue" />
        <span>
          Une citation inspirante sur la qualité, le changement ou la décision ? Proposez-la :
          elle sera examinée avant d&apos;apparaître dans le carrousel des pages catalogue.
        </span>
      </p>

      {status === 'success' && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">Citation envoyée</p>
            <p className="mt-0.5">Merci ! L&apos;équipe va l&apos;examiner. Vous pouvez en proposer d&apos;autres.</p>
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
            <label className={labelClass}>Citation <span className="text-red-400">*</span></label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className={textareaClass}
              placeholder="Ex: « On se souvient de la qualité bien plus longtemps que du prix. »"
              required
              maxLength={1000}
            />
          </div>

          <div>
            <label className={labelClass}>Auteur</label>
            <input
              type="text"
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              className={inputClass}
              placeholder="Facultatif — ex: Victor Hugo"
              maxLength={200}
            />
          </div>
        </div>

        <Button loading={isPending}>
          {isPending ? 'Envoi…' : 'Envoyer la citation'}
        </Button>
      </form>
    </div>
  )
}
