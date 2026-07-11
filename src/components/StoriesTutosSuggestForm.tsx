'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Video, Send, Check } from 'lucide-react'
import { submitVideoProposal } from '@/lib/actions/videos'
import { useAuth } from '@/components/providers/AuthProvider'

export default function StoriesTutosSuggestForm({ userEmail, defaultOpen = false }: { userEmail?: string | null; defaultOpen?: boolean }) {
  // Email de notification : prop serveur si fournie, sinon l'email de session lu côté client
  // → garde la page stories-tutos statique/ISR (cf passe 2 ISR).
  const { user } = useAuth()
  const email = userEmail ?? user?.email ?? null
  const [open, setOpen] = useState(defaultOpen)
  const [notify, setNotify] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const titreRef = useRef<HTMLInputElement>(null)

  // Auto-ouvrir + focus si on arrive via l'ancre #proposer
  useEffect(() => {
    if (window.location.hash === '#proposer') setOpen(true)
    const onHash = () => { if (window.location.hash === '#proposer') setOpen(true) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Focus le premier champ dès que le formulaire s'ouvre
  useEffect(() => {
    if (open) setTimeout(() => titreRef.current?.focus(), 50)
  }, [open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    const titre = (fd.get('titre') as string) || ''
    const url = (fd.get('url') as string) || ''
    const description = (fd.get('description') as string) || ''
    const type = ((fd.get('type') as string) || 'youtube') as 'youtube' | 'vimeo' | 'autre'
    const proposerEmail = (fd.get('email') as string) || null
    startTransition(async () => {
      const res = await submitVideoProposal({ titre, url, description, type, proposerEmail })
      if (res.status === 'ERROR') {
        setError(res.message)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 text-center py-8">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Proposition envoyée, merci !</p>
        <p className="text-xs text-gray-400">Elle sera examinée par notre équipe avant publication.</p>
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-gray-100 pt-8">
      {!open ? (
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">Une vidéo à partager avec la communauté ?</p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-blue border border-accent-blue/30 rounded-xl hover:bg-accent-blue/5 transition-colors"
          >
            <Video className="w-4 h-4" />
            Proposer une vidéo
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white rounded-2xl shadow-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-navy">Proposer une vidéo</h3>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Titre *</label>
            <input
              ref={titreRef}
              name="titre"
              required
              placeholder="ex. Comment utiliser DMP en 5 min"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">URL de la vidéo *</label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://youtube.com/watch?v=..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Type *</label>
              <select
                name="type"
                defaultValue="youtube"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description <span className="text-gray-400 font-normal">(facultatif)</span></label>
            <textarea
              name="description"
              rows={3}
              placeholder="En une phrase, de quoi parle la vidéo ?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-none"
            />
          </div>
          {email ? (
            <>
              <input type="hidden" name="email" value={notify ? email : ''} />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={e => setNotify(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent-blue"
                />
                <span className="text-xs text-gray-500">
                  M&apos;envoyer un email lors de la publication <span className="text-gray-400">({email})</span>
                </span>
              </label>
            </>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email <span className="text-gray-400 font-normal">(facultatif, pour être informé)</span></label>
              <input
                name="email"
                type="email"
                placeholder="vous@exemple.fr"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isPending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
