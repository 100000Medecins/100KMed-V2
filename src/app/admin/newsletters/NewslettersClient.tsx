'use client'

import { useState } from 'react'
import {
  Send, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, Mail, Clock,
  Sparkles, Pencil, X, Maximize2, ChevronDown, ChevronUp, CalendarClock, XCircle, ExternalLink,
} from 'lucide-react'
import type { Newsletter } from './page'

interface Props {
  newsletters: Newsletter[]
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

const SAMPLE_VALUES: Record<string, string> = {
  nom: 'Dr. DUPONT',
  lien_desabonnement: '#',
  lien_navigateur: '#',
}

function renderPreview(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{{${key}}}`)
}

// Champ textarea réutilisable
function Field({ label, value, onChange, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y text-gray-700"
      />
    </div>
  )
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

  // — Programmation —
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('07:30')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState<Record<string, string | null>>({})

  // — Édition structurée —
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<{
    sujet: string; intro: string
    accroche_article_1: string; accroche_article_2: string
    conclusion: string; nouveautes: string
  }>({ sujet: '', intro: '', accroche_article_1: '', accroche_article_2: '', conclusion: '', nouveautes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function getSendState(id: string): SendState { return sendState[id] ?? 'idle' }
  function setSend(id: string, s: SendState) { setSendState(p => ({ ...p, [id]: s })) }
  function setField(key: keyof typeof editFields) { return (v: string) => setEditFields(p => ({ ...p, [key]: v })) }

  // ── Programmation ─────────────────────────────────────────────────────────
  function getScheduledAt(nl: Newsletter): string | null {
    return scheduledAt[nl.id] !== undefined ? scheduledAt[nl.id] : nl.scheduled_at ?? null
  }

  function startSchedule(nl: Newsletter) {
    const current = getScheduledAt(nl)
    if (current) {
      const d = new Date(current)
      setScheduleDate(d.toISOString().slice(0, 10))
      setScheduleTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    } else {
      // Prochain mardi à 7h30
      const next = new Date()
      next.setDate(next.getDate() + ((2 - next.getDay() + 7) % 7 || 7))
      setScheduleDate(next.toISOString().slice(0, 10))
      setScheduleTime('07:30')
    }
    setSchedulingId(nl.id)
    setScheduleError(null)
  }

  async function handleSaveSchedule(id: string) {
    if (!scheduleDate) { setScheduleError('Choisissez une date.'); return }
    setSavingSchedule(true)
    setScheduleError(null)
    const scheduled_at = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
    try {
      const res = await fetch('/api/admin/programmer-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduled_at }),
      })
      const json = await res.json()
      if (!res.ok) { setScheduleError(json.error ?? 'Erreur'); return }
      setScheduledAt(p => ({ ...p, [id]: scheduled_at }))
      setSchedulingId(null)
    } catch (e) {
      setScheduleError(String(e))
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleCancelSchedule(id: string) {
    try {
      await fetch('/api/admin/programmer-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduled_at: null }),
      })
      setScheduledAt(p => ({ ...p, [id]: null }))
    } catch { /* silencieux */ }
  }

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
      if (!res.ok) { setGenerateError(json.error ?? 'Erreur inconnue'); return }
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
      if (!res.ok) { setSendErrors(p => ({ ...p, [id]: json.error ?? 'Erreur' })); setSend(id, 'error'); return }
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
    const j = nl.contenu_json ?? {}
    setEditingId(nl.id)
    setEditFields({
      sujet: nl.sujet ?? '',
      intro: j.intro ?? '',
      accroche_article_1: j.accroche_article_1 ?? j.articles?.[0]?.accroche ?? '',
      accroche_article_2: j.accroche_article_2 ?? j.articles?.[1]?.accroche ?? '',
      conclusion: j.conclusion ?? '',
      nouveautes: j.nouveautes ?? '',
    })
    setEditError(null)
    setPreviewId(null)
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch('/api/admin/update-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editFields }),
      })
      const json = await res.json()
      if (!res.ok) { setEditError(json.error ?? 'Erreur'); return }
      setNewsletters(prev => prev.map(n =>
        n.id === id
          ? {
              ...n,
              sujet: editFields.sujet,
              contenu_html: json.contenu_html,
              contenu_json: {
                ...n.contenu_json,
                sujet: editFields.sujet,
                intro: editFields.intro,
                accroche_article_1: editFields.accroche_article_1,
                accroche_article_2: editFields.accroche_article_2,
                conclusion: editFields.conclusion,
                nouveautes: editFields.nouveautes,
              },
            }
          : n
      ))
      setEditingId(null)
      setPreviewId(id) // ouvrir l'aperçu après sauvegarde
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
            <p className="text-xs text-gray-400">Claude génère le brouillon à partir des articles du blog, des études et questionnaires du mois.</p>
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
                placeholder="Ex : Mets en avant l'article sur l'IA en premier. Ton particulièrement enthousiaste ce mois-ci car c'est notre premier anniversaire sur la plateforme."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-none text-gray-700 placeholder:text-gray-300"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Sans instruction, Claude se base sur les 2 derniers articles de blog, la dernière étude et le dernier questionnaire ouverts.
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
              <button onClick={() => { setShowGenForm(false); setGenerateError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
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
          <p className="text-xs text-gray-400 mt-1">Utilisez le formulaire ci-dessus ou attendez la génération automatique le 22 du mois à 9h.</p>
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
            const j = nl.contenu_json
            const hasArticles = (j?.articles?.length ?? 0) > 0
            const nlScheduledAt = getScheduledAt(nl)
            const isScheduling = schedulingId === nl.id

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
                    {isSent && (
                      <a
                        href={`/nl/${nl.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir en ligne
                      </a>
                    )}
                    {!isSent && !isEditing && (
                      <button onClick={() => startEdit(nl)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}
                    {nl.contenu_html && !isEditing && (
                      <button onClick={() => setPreviewId(isPreviewOpen ? null : nl.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors">
                        {isPreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {isPreviewOpen ? 'Fermer' : 'Aperçu'}
                      </button>
                    )}
                    {/* Programmation */}
                    {!isSent && !isEditing && !isScheduling && state === 'idle' && (
                      nlScheduledAt ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                          {new Date(nlScheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {new Date(nlScheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          <button onClick={() => startSchedule(nl)} className="ml-1 hover:text-blue-900 underline">Modifier</button>
                          <button onClick={() => handleCancelSchedule(nl.id)} className="ml-0.5 hover:text-red-600" title="Annuler la programmation">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startSchedule(nl)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-surface-light transition-colors">
                          <CalendarClock className="w-3.5 h-3.5" />
                          Programmer
                        </button>
                      )
                    )}
                    {!isSent && state === 'idle' && !isEditing && !nlScheduledAt && (
                      <button onClick={() => setSend(nl.id, 'confirming')} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-navy text-white hover:bg-navy/90 transition-colors">
                        <Send className="w-3.5 h-3.5" />
                        Envoyer
                      </button>
                    )}
                    {!isSent && state === 'confirming' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSend(nl.id)} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                          Confirmer l&apos;envoi
                        </button>
                        <button onClick={() => setSend(nl.id, 'idle')} className="text-xs text-gray-500 hover:text-gray-700 px-2">Annuler</button>
                      </div>
                    )}
                    {!isSent && state === 'sending' && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />Envoi…
                      </div>
                    )}
                  </div>
                </div>

                {/* Résultats */}
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
                      <AlertCircle className="w-4 h-4 shrink-0" />{sendErrors[nl.id]}
                    </div>
                  </div>
                )}

                {/* ── Formulaire de programmation ── */}
                {isScheduling && !isSent && (
                  <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-blue-50/40">
                    <p className="text-xs font-semibold text-blue-800">Programmer l&apos;envoi automatique</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={e => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 10)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Heure</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                        />
                      </div>
                      <div className="self-end flex items-center gap-2 pb-0.5">
                        <button
                          onClick={() => handleSaveSchedule(nl.id)}
                          disabled={savingSchedule}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
                        >
                          {savingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
                          {savingSchedule ? 'Enregistrement…' : 'Confirmer'}
                        </button>
                        <button onClick={() => { setSchedulingId(null); setScheduleError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
                          Annuler
                        </button>
                      </div>
                    </div>
                    {scheduleError && <p className="text-xs text-red-600">{scheduleError}</p>}
                    <p className="text-xs text-blue-600/70">Le cron tourne à 7h30 chaque jour — l&apos;envoi se fera le matin de la date choisie.</p>
                  </div>
                )}

                {/* ── Mode édition structurée ── */}
                {isEditing && (
                  <div className="border-t border-gray-100 px-6 py-5 space-y-5">
                    <Field label="Objet de l'email" value={editFields.sujet} onChange={setField('sujet')} rows={1} />
                    <Field label="Introduction (après « Bonjour Dr. NOM, »)" value={editFields.intro} onChange={setField('intro')} rows={3} />

                    {hasArticles && (
                      <div className="space-y-4 p-4 bg-surface-light rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Articles de blog</p>
                        {j?.articles?.map((a, i) => (
                          <div key={a.slug} className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">{i + 1}. {a.titre}</p>
                            <textarea
                              value={i === 0 ? editFields.accroche_article_1 : editFields.accroche_article_2}
                              onChange={e => setField(i === 0 ? 'accroche_article_1' : 'accroche_article_2')(e.target.value)}
                              rows={2}
                              placeholder="Phrase d'accroche courte et percutante…"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-none text-gray-700 placeholder:text-gray-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <Field label="Conclusion (section « Votre avis compte »)" value={editFields.conclusion} onChange={setField('conclusion')} rows={2} />
                    <Field
                      label="Nouveautés techniques"
                      value={editFields.nouveautes}
                      onChange={setField('nouveautes')}
                      rows={2}
                      hint="Laisser vide si aucune nouveauté à mentionner."
                    />

                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSaveEdit(nl.id)}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-colors"
                      >
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {savingEdit ? 'Enregistrement…' : 'Enregistrer et prévisualiser'}
                      </button>
                      <button onClick={() => { setEditingId(null); setEditError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
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
                        Aperçu — variables remplacées par des valeurs fictives
                      </span>
                      <button onClick={() => setFullscreenId(nl.id)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        <Maximize2 className="w-3.5 h-3.5" />Plein écran
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
