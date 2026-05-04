'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { X, Send, Clock, Calendar, CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import SpecialitesSelector from '@/components/admin/SpecialitesSelector'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false })

type SendMode = 'now' | 'later'
type ModalState = 'config' | 'sending' | 'done' | 'error'

export type PublishEmailConfig = {
  type: 'questionnaire' | 'etude'
  id: string
  titre: string
  description?: string | null
  lienInitial?: string
  specialitesInitiales?: string[]
}

interface Props {
  config: PublishEmailConfig
  onClose: () => void
  onPublished: () => void
}

export default function PublishEmailModal({ config, onClose, onPublished }: Props) {
  const [lien, setLien] = useState(config.lienInitial ?? '')
  const [textePromoteur, setTextePromoteur] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [specialitesCibles, setSpecialitesCibles] = useState<string[]>(config.specialitesInitiales ?? [])
  const [sendMode, setSendMode] = useState<SendMode>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [modalState, setModalState] = useState<ModalState>('config')
  const [result, setResult] = useState<{ sent?: number; total?: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const minDatetime = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)
    try {
      const { genererTexteEmail } = await import('@/lib/actions/emails-campagnes')
      const res = await genererTexteEmail(config.type, config.titre, config.description)
      if (res.error) { setGenError(res.error); return }
      if (res.html) {
        setTextePromoteur(res.html)
        setEditorKey(k => k + 1)
      }
    } catch (e) {
      setGenError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  function handlePublishOnly() {
    startTransition(async () => {
      setModalState('sending')
      try {
        if (config.type === 'questionnaire') {
          const { setStatutQuestionnaire } = await import('@/lib/actions/questionnaires-these')
          const res = await setStatutQuestionnaire(config.id, 'publie')
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
        } else {
          const { setStatutEtude } = await import('@/lib/actions/etudes-cliniques')
          const res = await setStatutEtude(config.id, 'publie')
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
        }
        onPublished()
        onClose()
      } catch (e) {
        setErrorMsg(String(e))
        setModalState('error')
      }
    })
  }

  function handlePublishWithEmail() {
    if (sendMode === 'later' && !scheduledAt) return
    startTransition(async () => {
      setModalState('sending')
      try {
        // 1. Publier l'item
        if (config.type === 'questionnaire') {
          const { setStatutQuestionnaire } = await import('@/lib/actions/questionnaires-these')
          const res = await setStatutQuestionnaire(config.id, 'publie')
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
        } else {
          const { setStatutEtude } = await import('@/lib/actions/etudes-cliniques')
          const res = await setStatutEtude(config.id, 'publie')
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
        }

        // 2. Email immédiat ou différé
        if (sendMode === 'now') {
          const { sendCampagneNow } = await import('@/lib/actions/emails-campagnes')
          const res = await sendCampagneNow(config.type, {
            refId: config.id,
            titre: config.titre,
            lien,
            textePromoteur,
            specialitesCibles,
          })
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
          setResult({ sent: res.sent, total: res.total })
        } else {
          const { scheduleCampagne } = await import('@/lib/actions/emails-campagnes')
          const res = await scheduleCampagne(config.type, {
            refId: config.id,
            titre: config.titre,
            lien,
            textePromoteur,
            specialitesCibles,
            scheduledAt,
          })
          if (res.error) { setErrorMsg(res.error); setModalState('error'); return }
          setResult(null)
        }

        setModalState('done')
        onPublished()
      } catch (e) {
        setErrorMsg(String(e))
        setModalState('error')
      }
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              {config.type === 'questionnaire' ? 'Questionnaire de thèse' : 'Étude clinique'}
            </p>
            <h2 className="text-sm font-bold text-navy mt-0.5 line-clamp-1">{config.titre}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {modalState === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
              <p className="text-sm text-gray-600">Publication en cours…</p>
            </div>
          )}

          {modalState === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-sm font-semibold text-navy">
                {config.type === 'questionnaire' ? 'Questionnaire publié' : 'Étude publiée'} !
              </p>
              {result ? (
                <p className="text-xs text-gray-500">
                  {result.sent} email{result.sent !== 1 ? 's' : ''} envoyé{result.sent !== 1 ? 's' : ''} sur {result.total} inscrits.
                </p>
              ) : sendMode === 'later' ? (
                <p className="text-xs text-gray-500">
                  Email programmé le {new Date(scheduledAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.
                </p>
              ) : null}
            </div>
          )}

          {modalState === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-700">{errorMsg}</p>
              <button onClick={() => setModalState('config')} className="text-xs text-accent-blue hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {modalState === 'config' && (
            <>
              {/* Lien */}
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">Lien vers {config.type === 'questionnaire' ? 'le questionnaire' : "l'étude"}</label>
                <input
                  type="url"
                  value={lien}
                  onChange={(e) => setLien(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              {/* Spécialités */}
              <SpecialitesSelector value={specialitesCibles} onChange={setSpecialitesCibles} />

              {/* Texte promoteur */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-navy">
                    Texte promoteur <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generating
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />
                    }
                    {generating ? 'Génération…' : 'Générer avec IA'}
                  </button>
                </div>
                {genError && (
                  <p className="text-xs text-red-500 mb-1.5">{genError}</p>
                )}
                <RichTextEditor key={editorKey} initialContent={textePromoteur} onChange={setTextePromoteur} minHeight={120} />
                <p className="text-xs text-gray-400 mt-1">
                  Inséré via <code className="bg-gray-100 px-1 rounded font-mono">{'{{texte_promoteur}}'}</code> dans le template.
                </p>
              </div>

              {/* Mode d'envoi */}
              <div>
                <p className="text-xs font-medium text-navy mb-2">Envoi de l&apos;email</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendMode('now')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      sendMode === 'now'
                        ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    Maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode('later')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      sendMode === 'later'
                        ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    Programmer
                  </button>
                </div>

                {sendMode === 'later' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Date et heure d&apos;envoi
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={minDatetime}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {modalState === 'config' && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={handlePublishOnly}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Publier sans email
            </button>
            <button
              type="button"
              onClick={handlePublishWithEmail}
              disabled={isPending || (sendMode === 'later' && !scheduledAt)}
              className="flex items-center gap-2 px-5 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Publier {sendMode === 'now' ? '+ envoyer' : '+ programmer'}
            </button>
          </div>
        )}

        {modalState === 'done' && (
          <div className="flex justify-center px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
