'use client'

import { useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { submitVideoProposal } from '@/lib/actions/videos'
import { Video, CheckCircle2, AlertCircle } from 'lucide-react'

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass = inputClass + ' resize-y'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export default function ProposerVideoPage() {
  const { user, loading } = useAuth()
  const [titre, setTitre] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'youtube' | 'vimeo' | 'autre'>('youtube')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const previewId = type === 'youtube' ? getYouTubeId(url) : null

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement…</div>
  }
  if (!user) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center text-sm text-gray-500">
        Vous devez être connecté pour proposer une vidéo.
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('idle')
    setErrorMessage('')
    startTransition(async () => {
      const result = await submitVideoProposal({ titre, url, description, type })
      if (result.status === 'SUCCESS') {
        setStatus('success')
        setTitre(''); setUrl(''); setDescription(''); setType('youtube')
      } else {
        setStatus('error')
        setErrorMessage(result.message)
      }
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6 flex items-start gap-2">
        <Video className="w-4 h-4 mt-0.5 shrink-0 text-accent-blue" />
        <span>
          Une story ou un tuto à partager avec la communauté ? Soumets le lien, l&apos;équipe le passera en revue avant publication.
        </span>
      </p>

      {status === 'success' && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">Vidéo envoyée</p>
            <p className="mt-0.5">Merci ! L&apos;équipe va la passer en revue. Tu peux en proposer d&apos;autres.</p>
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
              placeholder="Ex: « Comment configurer la téléconsultation sur Doctolib »"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className={labelClass}>URL de la vidéo <span className="text-red-400">*</span></label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
            {previewId && (
              <div className="mt-3 rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${previewId}`}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'youtube' | 'vimeo' | 'autre')} className={inputClass}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={textareaClass}
              placeholder="En quelques phrases : à qui s'adresse cette vidéo, ce qu'elle couvre, etc."
              maxLength={1000}
            />
          </div>

          <p className="text-[11px] text-gray-400 italic">
            La rubrique (story, tuto, par catégorie de logiciel…) sera déterminée par l&apos;équipe lors de la mise en ligne.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : 'Envoyer la vidéo'}
        </button>
      </form>
    </div>
  )
}
