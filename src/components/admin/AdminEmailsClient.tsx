'use client'

import { useState } from 'react'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'
import NewslettersClient from '@/app/admin/newsletters/NewslettersClient'
import type { Newsletter } from '@/app/admin/newsletters/page'

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
}

export default function AdminEmailsClient({ sections, newsletters = [] }: Props) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? '')

  const activeSection = sections.find((s) => s.key === activeTab)

  return (
    <div>
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
