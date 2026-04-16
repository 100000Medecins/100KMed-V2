'use client'

import { useState } from 'react'
import { Send, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, Mail, Clock } from 'lucide-react'
import type { Newsletter } from './page'

interface Props {
  newsletters: Newsletter[]
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

export default function NewslettersClient({ newsletters }: Props) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [sendState, setSendState] = useState<Record<string, SendState>>({})
  const [sendResults, setSendResults] = useState<Record<string, { sent: number; total: number }>>({})
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({})

  function getState(id: string): SendState {
    return sendState[id] ?? 'idle'
  }

  function setState(id: string, s: SendState) {
    setSendState((prev) => ({ ...prev, [id]: s }))
  }

  async function handleSend(id: string) {
    setState(id, 'sending')
    setSendErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch('/api/admin/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSendErrors((prev) => ({ ...prev, [id]: json.error ?? 'Erreur inconnue' }))
        setState(id, 'error')
        return
      }
      setSendResults((prev) => ({ ...prev, [id]: { sent: json.sent, total: json.total } }))
      setState(id, 'done')
    } catch (e) {
      setSendErrors((prev) => ({ ...prev, [id]: String(e) }))
      setState(id, 'error')
    }
  }

  if (newsletters.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-10 text-center">
        <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">Aucune newsletter générée pour l&apos;instant.</p>
        <p className="text-xs text-gray-400 mt-1">
          Le premier brouillon sera créé automatiquement le 22 du mois à 9h.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {newsletters.map((nl) => {
        const state = getState(nl.id)
        const isPreviewOpen = previewId === nl.id
        const moisLabel = new Date(nl.mois + '-01').toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        })
        const isSent = nl.status === 'sent' || state === 'done'
        const result = sendResults[nl.id]

        return (
          <div key={nl.id} className="bg-white rounded-card shadow-card overflow-hidden">
            {/* En-tête */}
            <div className="px-6 py-4 flex items-center gap-4">
              <div className={`p-2 rounded-xl ${isSent ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-500'}`}>
                {isSent ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-navy capitalize">{moisLabel}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isSent
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isSent ? 'Envoyée' : 'Brouillon'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{nl.sujet ?? '(sans objet)'}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Infos envoi */}
                {isSent && (nl.recipient_count ?? result?.sent) != null && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {result?.sent ?? nl.recipient_count} envoyé{(result?.sent ?? nl.recipient_count ?? 0) > 1 ? 's' : ''}
                    {nl.sent_at && ` · ${new Date(nl.sent_at).toLocaleDateString('fr-FR')}`}
                  </span>
                )}

                {/* Bouton preview */}
                {nl.contenu_html && (
                  <button
                    onClick={() => setPreviewId(isPreviewOpen ? null : nl.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors"
                  >
                    {isPreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isPreviewOpen ? 'Fermer' : 'Prévisualiser'}
                  </button>
                )}

                {/* Bouton envoi (brouillon uniquement) */}
                {!isSent && state === 'idle' && (
                  <button
                    onClick={() => setState(nl.id, 'confirming')}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy-dark transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer
                  </button>
                )}

                {!isSent && state === 'confirming' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSend(nl.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Confirmer l&apos;envoi
                    </button>
                    <button
                      onClick={() => setState(nl.id, 'idle')}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {!isSent && state === 'sending' && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Envoi…
                  </div>
                )}
              </div>
            </div>

            {/* Résultat envoi */}
            {state === 'done' && result && (
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {result.sent} email{result.sent > 1 ? 's' : ''} envoyé{result.sent > 1 ? 's' : ''} sur {result.total} destinataires.
                </div>
              </div>
            )}

            {state === 'error' && sendErrors[nl.id] && (
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {sendErrors[nl.id]}
                </div>
              </div>
            )}

            {/* Prévisualisation */}
            {isPreviewOpen && nl.contenu_html && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Aperçu — les variables {'{{nom}}'} et {'{{lien_desabonnement}}'} seront remplacées à l&apos;envoi</span>
                </div>
                <iframe
                  srcDoc={nl.contenu_html
                    .replace(/\{\{nom\}\}/g, 'Dr. DUPONT')
                    .replace(/\{\{lien_desabonnement\}\}/g, '#')}
                  className="w-full border-0"
                  style={{ height: '600px' }}
                  title={`Prévisualisation newsletter ${moisLabel}`}
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
