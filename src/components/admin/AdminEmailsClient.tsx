'use client'

import { useState, useTransition } from 'react'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'
import NewslettersClient from '@/app/admin/newsletters/NewslettersClient'
import type { Newsletter } from '@/app/admin/newsletters/page'
import { setSiteConfig } from '@/lib/actions/siteConfig'

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
}

export default function AdminEmailsClient({ sections, newsletters = [], cronsActifs = false, excuseCount = 0 }: Props) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? '')
  const [cronsOn, setCronsOn] = useState(cronsActifs)
  const [isPending, startTransition] = useTransition()
  const [testSending, setTestSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ ok?: boolean; sentTo?: string; forUser?: string; links?: { lien1Clic: string; lienReevaluation: string }; error?: string } | null>(null)
  const [excuseSending, setExcuseSending] = useState(false)
  const [excuseResult, setExcuseResult] = useState<{ ok?: boolean; sent?: number; total?: number; errors?: string[]; error?: string } | null>(null)
  const [excuseDone, setExcuseDone] = useState(false)

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

  async function handleSendExcuse() {
    if (!window.confirm(`Envoyer l'email d'excuse aux ${excuseCount} médecins concernés ? Cette action est irréversible.`)) return
    setExcuseSending(true)
    setExcuseResult(null)
    try {
      const res = await fetch('/api/admin/send-excuse-relance', { method: 'POST' })
      const json = await res.json()
      setExcuseResult(json)
      if (json.ok) setExcuseDone(true)
    } catch (e) {
      setExcuseResult({ error: String(e) })
    } finally {
      setExcuseSending(false)
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
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">Email d&apos;excuse à envoyer — 23/04/2026</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                <strong>{excuseCount} médecins</strong> ont reçu un email de relance ce matin avec des liens
                pointant vers l&apos;ancien site (404). Un email d&apos;excuse avec les liens corrigés doit leur être renvoyé.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Les liens dans cet email pointent vers <strong>{typeof window !== 'undefined' ? window.location.origin : ''}</strong>.
                À n&apos;envoyer que depuis le bon environnement (www.100000medecins.org une fois en prod).
              </p>
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
            </div>
            <button
              onClick={handleSendExcuse}
              disabled={excuseSending}
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {excuseSending ? 'Envoi en cours…' : `Envoyer l'email d'excuse`}
            </button>
          </div>
        </div>
      )}
      {excuseDone && excuseResult?.ok && (
        <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          ✅ Email d&apos;excuse envoyé à <strong>{excuseResult.sent}</strong> médecins le 23/04/2026. Ce bloc peut être retiré du code.
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
            <p className="text-xs text-gray-500">Envoie un email &quot;[TEST]&quot; à contact@100000medecins.org avec une vraie évaluation et les vrais liens.</p>
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
