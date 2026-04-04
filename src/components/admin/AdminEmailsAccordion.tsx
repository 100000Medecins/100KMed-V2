'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import EmailTemplateEditor from '@/components/admin/EmailTemplateEditor'
import type { EmailTemplate } from '@/lib/actions/emailTemplates'

interface TemplateConfig {
  id: string
  title: string
  description: string
  variables: string[]
  data: EmailTemplate | null
  defaultSujet: string
  /** Si true, affiche un bouton d'envoi masse */
  masseSendable?: boolean
}

interface AdminEmailsAccordionProps {
  templates: TemplateConfig[]
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

export default function AdminEmailsAccordion({ templates }: AdminEmailsAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [sendResult, setSendResult] = useState<{ sent: number; total: number } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  async function handleSendLancement() {
    setSendState('sending')
    setSendError(null)
    try {
      const res = await fetch('/api/admin/send-lancement', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setSendError(json.error ?? 'Erreur inconnue')
        setSendState('error')
        return
      }
      setSendResult({ sent: json.sent, total: json.total })
      setSendState('done')
    } catch (e) {
      setSendError(String(e))
      setSendState('error')
    }
  }

  return (
    <div className="space-y-3">
      {templates.map((tpl) => {
        const isOpen = openId === tpl.id
        const hasContent = !!(tpl.data?.contenu_html)

        return (
          <div key={tpl.id} className="bg-white rounded-card shadow-card overflow-hidden">
            {/* En-tête cliquable */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : tpl.id)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-light transition-colors text-left"
            >
              <div className={`p-2 rounded-xl ${hasContent ? 'bg-accent-blue/10 text-accent-blue' : 'bg-gray-100 text-gray-400'}`}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">{tpl.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {tpl.data?.updated_at && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    Modifié le {new Date(tpl.data.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </div>
            </button>

            {/* Contenu déroulant */}
            {isOpen && (
              <div className="px-6 pb-6 pt-1 border-t border-gray-100">
                {/* Variables disponibles */}
                <div className="flex flex-wrap items-center gap-1.5 mb-5 pt-4">
                  <span className="text-xs text-gray-500">Variables :</span>
                  {tpl.variables.map((v) => (
                    <code key={v} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-600">
                      {v}
                    </code>
                  ))}
                </div>

                <EmailTemplateEditor
                  templateId={tpl.id}
                  initialSujet={tpl.data?.sujet ?? tpl.defaultSujet}
                  initialHtml={tpl.data?.contenu_html ?? ''}
                  updatedAt={tpl.data?.updated_at ?? null}
                />

                {/* Bouton envoi masse (uniquement pour le mail de lancement) */}
                {tpl.masseSendable && (
                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-3">
                      Envoie ce mail à <strong>tous les utilisateurs</strong> ayant au moins une évaluation finalisée.
                      À utiliser une seule fois au moment du lancement.
                    </p>

                    {sendState === 'idle' && (
                      <button
                        onClick={() => setSendState('confirming')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-semibold bg-navy text-white hover:bg-navy-dark transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Envoyer à toute la base
                      </button>
                    )}

                    {sendState === 'confirming' && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                          Confirmer l&apos;envoi à toute la base ?
                        </p>
                        <button
                          onClick={handleSendLancement}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Oui, envoyer
                        </button>
                        <button
                          onClick={() => setSendState('idle')}
                          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    {sendState === 'sending' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours…
                      </div>
                    )}

                    {sendState === 'done' && sendResult && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {sendResult.sent} email{sendResult.sent > 1 ? 's' : ''} envoyé{sendResult.sent > 1 ? 's' : ''} sur {sendResult.total} destinataires.
                      </div>
                    )}

                    {sendState === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {sendError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
