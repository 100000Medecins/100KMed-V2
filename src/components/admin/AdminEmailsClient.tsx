'use client'

import { useState, useTransition } from 'react'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'
import NewslettersClient from '@/app/admin/newsletters/NewslettersClient'
import type { Newsletter } from '@/app/admin/newsletters/page'
import { setSiteConfig } from '@/lib/actions/siteConfig'
import { buildExcuseEmail } from '@/lib/email/excuseTemplate'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { Eye, Code, ChevronDown, ChevronUp, Calendar, X } from 'lucide-react'

interface TemplateConfig {
  id: string
  title: string
  description: string
  variables: string[]
  data: import('@/lib/actions/emailTemplates').EmailTemplate | null
  defaultSujet: string
  masseSendable?: boolean
  masseApiRoute?: string
  targetedSend?: {
    apiRoute: string
    optedInEmails: string[]
    labelLien: string
    labelTextePromoteur: string
  }
}

interface Section {
  key: string
  label: string
  description: string
  templates: TemplateConfig[]
}

interface Props {
  sections: Section[]
  newsletters?: Newsletter[]
  cronsActifs?: boolean
  excuseCount?: number
  excuseDefaultSujet?: string
  excuseDefaultHtml?: string
  excuseScheduledAt?: string | null
  adminEmail?: string
}

export default function AdminEmailsClient({
  sections,
  newsletters = [],
  cronsActifs = false,
  excuseCount = 0,
  excuseDefaultSujet = '',
  excuseDefaultHtml = '',
  excuseScheduledAt = null,
  adminEmail = 'contact@100000medecins.org',
}: Props) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? '')
  const [cronsOn, setCronsOn] = useState(cronsActifs)
  const [isPending, startTransition] = useTransition()
  const [testSending, setTestSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ ok?: boolean; sentTo?: string; forUser?: string; links?: { lien1Clic: string; lienReevaluation: string }; error?: string } | null>(null)
  const [excuseSending, setExcuseSending] = useState(false)
  const [excuseResult, setExcuseResult] = useState<{ ok?: boolean; sent?: number; total?: number; errors?: string[]; error?: string } | null>(null)
  const [excuseDone, setExcuseDone] = useState(false)
  const [excuseSujet, setExcuseSujet] = useState(excuseDefaultSujet)
  const [excuseHtml, setExcuseHtml] = useState(excuseDefaultHtml)
  const [showExcuseEditor, setShowExcuseEditor] = useState(false)
  const [excusePreviewHtml, setExcusePreviewHtml] = useState<string | null>(null)
  const [excuseRawMode, setExcuseRawMode] = useState(false)
  const [testExcuseEmail, setTestExcuseEmail] = useState('')
  const [testExcuseSending, setTestExcuseSending] = useState(false)
  const [testExcuseResult, setTestExcuseResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleResult, setScheduleResult] = useState<{ ok?: boolean; scheduledAt?: string; error?: string } | null>(null)
  const [currentSchedule, setCurrentSchedule] = useState<string | null>(excuseScheduledAt ?? null)
  const [cancelingSchedule, setCancelingSchedule] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const activeSection = sections.find((s) => s.key === activeTab)

  async function handleTestRelance() {
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/test-relance-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() || undefined }),
      })
      const json = await res.json()
      setTestResult(json)
    } catch (e) {
      setTestResult({ error: String(e) })
    } finally {
      setTestSending(false)
    }
  }

  function handleExcusePreview() {
    const sample: Record<string, string> = {
      nom: 'Dr. DUPONT',
      solution_nom: 'MonLogiciel Pro',
      lien_1clic: '#',
      lien_reevaluation: '#',
      lien_desabonnement: '#',
    }
    const rendered = excuseHtml.replace(/\{\{(\w+)\}\}/g, (_, key) => sample[key] ?? `{{${key}}}`)
    setExcusePreviewHtml(buildExcuseEmail(rendered))
  }

  async function handleSendExcuse() {
    if (!window.confirm(`Envoyer l'email d'excuse aux ${excuseCount} médecins concernés ? Cette action est irréversible.`)) return
    setExcuseSending(true)
    setExcuseResult(null)
    try {
      const res = await fetch('/api/admin/send-excuse-relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet: excuseSujet, htmlTemplate: excuseHtml }),
      })
      const json = await res.json()
      setExcuseResult(json)
      if (json.ok) setExcuseDone(true)
    } catch (e) {
      setExcuseResult({ error: String(e) })
    } finally {
      setExcuseSending(false)
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true)
    setDraftSaved(false)
    setDraftError(null)
    try {
      await setSiteConfig('excuse_draft_html', excuseHtml)
      await setSiteConfig('excuse_draft_sujet', excuseSujet)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (e) {
      setDraftError(String(e))
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleTestExcuse() {
    const email = testExcuseEmail.trim() || adminEmail
    setTestExcuseSending(true)
    setTestExcuseResult(null)
    try {
      const res = await fetch('/api/admin/send-excuse-relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet: excuseSujet, htmlTemplate: excuseHtml, testEmail: email }),
      })
      const json = await res.json()
      setTestExcuseResult(json.ok ? { ok: true } : { error: json.error ?? 'Erreur inconnue' })
    } catch (e) {
      setTestExcuseResult({ error: String(e) })
    } finally {
      setTestExcuseSending(false)
    }
  }

  async function handleScheduleExcuse() {
    if (!scheduleDate) return
    setScheduling(true)
    setScheduleResult(null)
    try {
      const res = await fetch('/api/admin/programmer-excuse-relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduleDate, sujet: excuseSujet, html: excuseHtml }),
      })
      const json = await res.json()
      setScheduleResult(json)
      if (json.ok) {
        setCurrentSchedule(scheduleDate)
        setShowScheduler(false)
      }
    } catch (e) {
      setScheduleResult({ error: String(e) })
    } finally {
      setScheduling(false)
    }
  }

  async function handleCancelSchedule() {
    setCancelingSchedule(true)
    try {
      await fetch('/api/admin/programmer-excuse-relance', { method: 'DELETE' })
      setCurrentSchedule(null)
      setScheduleResult(null)
    } finally {
      setCancelingSchedule(false)
    }
  }

  function handleCronsToggle() {
    const next = !cronsOn
    setCronsOn(next)
    startTransition(async () => {
      await setSiteConfig('crons_routiniers_actifs', String(next))
    })
  }

  return (
    <div>
      {/* Bloc d'urgence — email d'excuse du 23/04 */}
      {excuseCount > 0 && !excuseDone && (
        <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
          {/* En-tête */}
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">Email d&apos;excuse à envoyer — 23/04/2026</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                <strong>{excuseCount} médecins</strong> ont reçu un email de relance avec des liens pointant vers l&apos;ancien site (404).
                Un email d&apos;excuse avec les liens corrigés doit leur être renvoyé.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Les liens 1-clic seront générés vers le domaine de ce déploiement au moment de l&apos;envoi.
                Vérifiez que vous envoyez depuis le bon environnement.
              </p>
            </div>
            <button
              onClick={handleSendExcuse}
              disabled={excuseSending}
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {excuseSending ? 'Envoi en cours…' : `Envoyer à ${excuseCount} médecins`}
            </button>
          </div>

          {/* Résultat envoi */}
          {excuseResult && (
            <div className={`mt-3 text-xs rounded-lg p-3 ${excuseResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {excuseResult.ok ? (
                <p>✅ {excuseResult.sent} emails envoyés sur {excuseResult.total}.{excuseResult.errors && excuseResult.errors.length > 0 && ` (${excuseResult.errors.length} erreurs)`}</p>
              ) : (
                <p>Erreur : {excuseResult.error}</p>
              )}
              {excuseResult.errors && excuseResult.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside opacity-75">
                  {excuseResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Éditeur repliable */}
          <div className="mt-4 border-t border-amber-200 pt-3">
            <button
              type="button"
              onClick={() => setShowExcuseEditor(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 transition-colors"
            >
              {showExcuseEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showExcuseEditor ? 'Masquer l\'éditeur' : 'Modifier le contenu de l\'email'}
            </button>

            {showExcuseEditor && (
              <div className="mt-3 space-y-3 bg-white rounded-xl border border-amber-200 p-4">
                {/* Sujet */}
                <div>
                  <label className="block text-xs font-medium text-navy mb-1">Sujet de l&apos;email</label>
                  <p className="text-xs text-gray-400 mb-1">Variables : <code className="bg-gray-100 px-1 rounded font-mono">{`{{solution_nom}}`}</code></p>
                  <input
                    type="text"
                    value={excuseSujet}
                    onChange={(e) => setExcuseSujet(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  />
                </div>

                {/* Contenu HTML */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <label className="block text-xs font-medium text-navy">Corps du message</label>
                      <p className="text-xs text-gray-400">Variables : <code className="bg-gray-100 px-1 rounded font-mono text-xs">{`{{nom}}`}</code> <code className="bg-gray-100 px-1 rounded font-mono text-xs">{`{{solution_nom}}`}</code> · Les boutons et le footer sont ajoutés automatiquement.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                      >
                        {savingDraft ? 'Sauvegarde…' : draftSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExcuseRawMode(m => !m)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${excuseRawMode ? 'bg-navy text-white border-navy' : 'text-gray-500 border-gray-200 hover:border-gray-400 hover:text-navy'}`}
                      >
                        <Code className="w-3 h-3" />
                        {excuseRawMode ? 'HTML brut (actif)' : 'HTML brut'}
                      </button>
                    </div>
                  </div>
                  {draftError && (
                    <p className="text-xs text-red-600 mb-1">Erreur sauvegarde : {draftError}</p>
                  )}
                  {excuseRawMode ? (
                    <textarea
                      value={excuseHtml}
                      onChange={(e) => setExcuseHtml(e.target.value)}
                      style={{ minHeight: 280 }}
                      className="w-full font-mono text-xs text-gray-700 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 resize-y"
                      spellCheck={false}
                    />
                  ) : (
                    <RichTextEditor
                      initialContent={excuseHtml}
                      onChange={setExcuseHtml}
                      minHeight={280}
                    />
                  )}
                </div>

                {/* Aperçu */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleExcusePreview}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Aperçu (données fictives)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExcuseSujet(excuseDefaultSujet); setExcuseHtml(excuseDefaultHtml) }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>

                {/* Envoi test */}
                <div className="border-t border-amber-100 pt-3">
                  <p className="text-xs font-medium text-navy mb-1.5">Envoyer un test</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="email"
                      value={testExcuseEmail}
                      onChange={(e) => setTestExcuseEmail(e.target.value)}
                      placeholder={adminEmail}
                      className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                    />
                    <button
                      type="button"
                      onClick={handleTestExcuse}
                      disabled={testExcuseSending}
                      className="px-4 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {testExcuseSending ? 'Envoi…' : 'Envoyer test'}
                    </button>
                  </div>
                  {testExcuseResult && (
                    <p className={`text-xs mt-1 ${testExcuseResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {testExcuseResult.ok ? `✅ Email test envoyé à ${testExcuseEmail.trim() || adminEmail}` : `Erreur : ${testExcuseResult.error}`}
                    </p>
                  )}
                </div>

                {/* Planification */}
                <div className="border-t border-amber-100 pt-3">
                  {currentSchedule ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>Envoi programmé le <strong>{new Date(currentSchedule).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSchedule}
                        disabled={cancelingSchedule}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowScheduler(v => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {showScheduler ? 'Masquer la programmation' : 'Programmer l\'envoi pour plus tard'}
                      </button>

                      {showScheduler && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                          />
                          <button
                            type="button"
                            onClick={handleScheduleExcuse}
                            disabled={scheduling || !scheduleDate}
                            className="px-4 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50"
                          >
                            {scheduling ? 'Programmation…' : 'Confirmer'}
                          </button>
                          {scheduleResult?.error && (
                            <span className="text-xs text-red-600">{scheduleResult.error}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {excuseDone && excuseResult?.ok && (
        <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          ✅ Email d&apos;excuse envoyé à <strong>{excuseResult.sent}</strong> médecins le 23/04/2026. Ce bloc peut être retiré du code.
        </div>
      )}

      {/* Modal aperçu email d'excuse */}
      {excusePreviewHtml && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-500">Aperçu — données fictives</p>
                <p className="text-sm font-semibold text-navy">{excuseSujet.replace(/\{\{solution_nom\}\}/g, 'MonLogiciel Pro')}</p>
              </div>
              <button onClick={() => setExcusePreviewHtml(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <iframe
              srcDoc={excusePreviewHtml}
              className="w-full flex-1 border-0 rounded-b-card"
              title="Aperçu email d'excuse"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Kill-switch crons routiniers */}
      <div className={`mb-6 rounded-xl border-2 p-4 flex items-start gap-4 ${
        cronsOn ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
      }`}>
        <div className="flex-1">
          <p className={`font-bold text-sm ${cronsOn ? 'text-green-800' : 'text-red-800'}`}>
            {cronsOn ? 'Emails routiniers actifs' : 'Emails routiniers désactivés'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Ce switch contrôle l&apos;envoi automatique des relances (1 an, 3 mois, incomplets, PSC, newsletter).
            Les emails transactionnels (confirmation d&apos;inscription, réinitialisation mdp) ne sont pas affectés.
            {!cronsOn && (
              <span className="block mt-1 font-semibold text-red-700">
                À activer uniquement au déploiement final en production.
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleCronsToggle}
          disabled={isPending}
          className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
            cronsOn ? 'bg-green-500' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={cronsOn}
        >
          <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            cronsOn ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Test email relance */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-navy">Tester l&apos;email de relance 1 an</p>
            <p className="text-xs text-gray-500">Envoie un email &quot;[TEST]&quot; à <strong>{adminEmail}</strong> avec une vraie évaluation et les vrais liens.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Email du compte à simuler (laisser vide = premier venu)"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
            <button
              onClick={handleTestRelance}
              disabled={testSending}
              className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/80 transition-colors disabled:opacity-50"
            >
              {testSending ? 'Envoi…' : 'Envoyer test'}
            </button>
          </div>
        </div>
        {testResult && (
          <div className={`text-xs rounded-lg p-3 ${testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.ok ? (
              <>
                <p>Email envoyé à <strong>{testResult.sentTo}</strong> · simulé pour <strong>{testResult.forUser}</strong></p>
                {testResult.links && (
                  <p className="mt-1 break-all">
                    Lien 1-clic : <a href={testResult.links.lien1Clic} target="_blank" rel="noreferrer" className="underline">{testResult.links.lien1Clic}</a>
                  </p>
                )}
              </>
            ) : (
              <p>Erreur : {testResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1 w-fit mb-6">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveTab(section.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === section.key
                ? 'bg-navy text-white shadow-sm'
                : 'text-gray-500 hover:text-navy hover:bg-surface-light'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Contenu de la section active */}
      {activeSection && (
        activeSection.key === 'newsletter' ? (
          <div className="space-y-8">
            <NewslettersClient newsletters={newsletters} />
            {activeSection.templates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Envois ponctuels</p>
                <AdminEmailsAccordion templates={activeSection.templates} />
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{activeSection.description}</p>
            <AdminEmailsAccordion templates={activeSection.templates} />
          </>
        )
      )}
    </div>
  )
}
