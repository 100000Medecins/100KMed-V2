'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Building2, Send, Check } from 'lucide-react'
import { suggestEditeurReferencement } from '@/lib/actions/admin'

export default function EditeurReferencementForm({
  defaultOpen = false,
}: {
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nomEditeurRef = useRef<HTMLInputElement>(null)

  // Auto-ouvrir + focus si on arrive via l'ancre #demande-referencement
  useEffect(() => {
    if (window.location.hash === '#demande-referencement') setOpen(true)
    const onHash = () => {
      if (window.location.hash === '#demande-referencement') setOpen(true)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Focus le premier champ dès que le formulaire s'ouvre
  useEffect(() => {
    if (open) setTimeout(() => nomEditeurRef.current?.focus(), 50)
  }, [open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await suggestEditeurReferencement(fd)
      if (res?.error) {
        setError(res.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="mt-16 flex flex-col items-center gap-2 text-center py-10 bg-white rounded-2xl shadow-card">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-gray-700">
          Demande envoyée, merci !
        </p>
        <p className="text-xs text-gray-500 max-w-md">
          Vous allez recevoir un accusé de réception par email. Notre équipe
          reviendra vers vous dans les meilleurs délais.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-16">
      {!open ? (
        <div className="bg-white rounded-2xl shadow-card px-5 py-4 max-w-xl mx-auto flex items-center gap-4">
          <div className="inline-flex w-9 h-9 rounded-full bg-accent-blue/10 items-center justify-center text-accent-blue flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy leading-snug">
              Votre société n&apos;apparaît pas dans cette liste ?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Demandez à être référencé.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-accent-blue rounded-button hover:bg-accent-blue/90 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <Building2 className="w-3.5 h-3.5" />
            Demander
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-card p-6 md:p-8 space-y-4 max-w-2xl mx-auto"
        >
          <div>
            <h2 className="text-base md:text-lg font-bold text-navy mb-1">
              Demande de référencement
            </h2>
            <p className="text-xs text-gray-500">
              Tous les champs marqués d&apos;un astérisque sont obligatoires.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Nom de la société *
              </label>
              <input
                ref={nomEditeurRef}
                name="nom_editeur"
                required
                placeholder="ex. Acme Santé"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Nom du logiciel
              </label>
              <input
                name="nom_solution"
                placeholder="ex. Acme Pro"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Email de contact *
              </label>
              <input
                name="email_contact"
                type="email"
                required
                placeholder="vous@societe.fr"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Site web
              </label>
              <input
                name="site_web"
                type="url"
                placeholder="https://…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Message
            </label>
            <textarea
              name="message"
              rows={4}
              placeholder="Présentez brièvement votre société, vos produits, ou tout ce qui pourrait nous aider à traiter votre demande."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-y"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-accent-blue text-white rounded-button hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
