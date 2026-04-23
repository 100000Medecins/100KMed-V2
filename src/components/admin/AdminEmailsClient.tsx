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
}

export default function AdminEmailsClient({ sections, newsletters = [], cronsActifs = false }: Props) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? '')
  const [cronsOn, setCronsOn] = useState(cronsActifs)
  const [isPending, startTransition] = useTransition()

  const activeSection = sections.find((s) => s.key === activeTab)

  function handleCronsToggle() {
    const next = !cronsOn
    setCronsOn(next)
    startTransition(async () => {
      await setSiteConfig('crons_routiniers_actifs', String(next))
    })
  }

  return (
    <div>
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
