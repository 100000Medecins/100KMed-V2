'use client'

import { useState } from 'react'
import {
  Send, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, Mail, Clock,
  Sparkles, Pencil, X, Maximize2, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Newsletter } from './page'

interface Props {
  newsletters: Newsletter[]
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

const SAMPLE_VALUES: Record<string, string> = {
  nom: 'Dr. DUPONT',
  lien_desabonnement: '#',
}

function renderPreview(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`)
}

export default function NewslettersClient({ newsletters: initialNewsletters }: Props) {
  const [newsletters, setNewsletters] = useState<Newsletter[]>(initialNewsletters)

  // — Génération —
  const [showGenForm, setShowGenForm] = useState(false)
  const [promptUtilisateur, setPromptUtilisateur] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // — Envoi —
  const [sendState, setSendState] = useState<Record<string, SendState>>({})
  const [sendResults, setSendResults] = useState<Record<string, { sent: number; total: number }>>({})
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({})

  // — Aperçu —
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [fullscreenId, setFullscreenId] = useState<string | null>(null)

  // — Édition HTML —
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function getSendState(id: string): SendState { return sendState[id] ?? 'idle' }
  function setSend(id: string, s: SendState) { setSendState(p => ({ ...p, [id]: s })) }

  // ── Génération ────────────────────────────────────────────────────────────
  async function handleGenerate() {
    setGenerateError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/generer-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptUtilisateur }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGenerateError(json.error ?? 'Erreur inconnue')
        return
      }
      // Upsert local : remplace si même mois, sinon ajoute en tête
      const generated: Newsletter = json.newsletter
      setNewsletters(prev => {
        const without = prev.filter(n => n.mois !== generated.mois)
        return [generated, ...without]
      })
      setShowGenForm(false)
      setPromptUtilisateur('')
      setPreviewId(generated.id)
    } catch (e) {
      setGenerateError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────
  async function handleSend(id: string) {
    setSend(id, 'sending')
    setSendErrors(p => ({ ...p, [id]: '' }))
    try {
      const res = await fetch('/api/admin/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSendErrors(p => ({ ...p, [id]: json.error ?? 'Erreur inconnue' }))
        setSend(id, 'error')
        return
      }
      setSendResults(p => ({ ...p, [id]: { sent: json.sent, total: json.total } }))
      setSend(id, 'done')
      setNewsletters(prev => prev.map(n => n.id === id ? { ...n, status: 'sent' } : n))
    } catch (e) {
      setSendErrors(p => ({ ...p, [id]: String(e) }))
      setSend(id, 'error')
    }
  }

  // ── Édition ───────────────────────────────────────────────────────────────
  function startEdit(nl: Newsletter) {
    setEditingId(nl.id)
    setEditContent(nl.contenu_html ?? '')
    setEditSubject(nl.sujet ?? '')
    setEditError(null)
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch('/api/admin/update-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sujet: editSubject, contenu_html: editContent }),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error ?? 'Erreur'); return }
      setNewsletters(prev => prev.map(n =>
        n.id === id ? { ...n, sujet: editSubject, contenu_html: editContent } : n
      ))
      setEditingId(null)
    } catch (e) {
      setEditError(String(e))
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Formulaire de génération ── */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => setShowGenForm(v => !v)}
          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-light transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-accent-blue" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-navy">Générer la newsletter du mois</p>
            <p className="text-xs text-gray-400">Claude génère le brouillon à partir des études, questionnaires et nouveautés du mois.</p>
          </div>
          {showGenForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showGenForm && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Instructions pour Claude <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={promptUtilisateur}
                onChange={e => setPromptUtilisateur(e.target.value)}
                rows={4}
                placeholder="Ex : Mets en avant l'étude sur l'IA documentaire en premier. Ton enthousiaste car c'est notre première newsletter. Mentionne aussi que les nouvelles catégories Agenda et IA scribe viennent d'arriver."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-none text-gray-700 placeholder:text-gray-300"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Sans instruction, Claude se base uniquement sur les données du mois (études, questionnaires, changelog).
              </p>
            </div>
            {generateError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {generateError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Génération en cours…' : 'Générer'}
              </button>
              <button
                onClick={() => { setShowGenForm(false); setGenerateError(null) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Liste des newsletters ── */}
      {newsletters.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Aucune newsletter générée pour l&apos;instant.</p>
          <p className="text-xs text-gray-400 mt-1">
            Utilisez le formulaire ci-dessus ou attendez la génération automatique le 22 du mois à 9h.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {newsletters.map((nl) => {
            const state = getSendState(nl.id)
            const isPreviewOpen = previewId === nl.id
            const isEditing = editingId === nl.id
            const moisLabel = new Date(nl.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            const isSent = nl.status === 'sent' || state === 'done'
            const result = sendResults[nl.id]

            return (
              <div key={nl.id} className="bg-white rounded-card shadow-card overflow-hidden">
                {/* En-tête */}
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className={`p-2 rounded-xl shrink-0 ${isSent ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-500'}`}>
                    {isSent ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-navy capitalize">{moisLabel}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isSent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isSent ? 'Envoyée' : 'Brouillon'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{nl.sujet ?? '(sans objet)'}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {isSent && (nl.recipient_count ?? result?.sent) != null && (
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {result?.sent ?? nl.recipient_count} envoyé{(result?.sent ?? nl.recipient_count ?? 0) > 1 ? 's' : ''}
                        {nl.sent_at && ` · ${new Date(nl.sent_at).toLocaleDateString('fr-FR')}`}
                      </span>
                    )}

                    {/* Modifier (brouillon uniquement) */}
                    {!isSent && !isEditing && (
                      <button
                        onClick={() => startEdit(nl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}

                    {/* Aperçu */}
                    {nl.contenu_html && !isEditing && (
                      <button
                        onClick={() => setPreviewId(isPreviewOpen ? null : nl.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors"
                      >
                        {isPreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {isPreviewOpen ? 'Fermer' : 'Aperçu'}
                      </button>
                    )}

                    {/* Envoi */}
                    {!isSent && state === 'idle' && !isEditing && (
                      <button
                        onClick={() => setSend(nl.id, 'confirming')}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy/90 transition-colors"
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
                        <button onClick={() => setSend(nl.id, 'idle')} className="text-xs text-gray-500 hover:text-gray-700 px-2">
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

                {/* ── Mode édition ── */}
                {isEditing && (
                  <div className="border-t border-gray-100 px-6 py-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Objet de l&apos;email</label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">HTML brut</label>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y"
                      />
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSaveEdit(nl.id)}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-colors"
                      >
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditError(null) }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Aperçu inline ── */}
                {isPreviewOpen && nl.contenu_html && !isEditing && (
                  <div className="border-t border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">
                        Aperçu — les variables {'{{nom}}'} et {'{{lien_desabonnement}}'} sont remplacées par des valeurs fictives
                      </span>
                      <button
                        onClick={() => setFullscreenId(nl.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Plein écran
                      </button>
                    </div>
                    <iframe
                      srcDoc={renderPreview(nl.contenu_html)}
                      className="w-full border-0"
                      style={{ height: '700px' }}
                      title={`Aperçu newsletter ${moisLabel}`}
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal plein écran ── */}
      {fullscreenId && (() => {
        const nl = newsletters.find(n => n.id === fullscreenId)
        if (!nl?.contenu_html) return null
        const moisLabel = new Date(nl.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
            <div className="bg-white flex items-center justify-between px-4 py-2 shrink-0">
              <span className="text-sm font-medium text-navy capitalize">Aperçu — {moisLabel}</span>
              <button onClick={() => setFullscreenId(null)} className="p-1 hover:bg-surface-light rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <iframe
              srcDoc={renderPreview(nl.contenu_html)}
              className="flex-1 w-full border-0"
              title={`Aperçu plein écran ${moisLabel}`}
              sandbox="allow-same-origin"
            />
          </div>
        )
      })()}
    </div>
  )
}
