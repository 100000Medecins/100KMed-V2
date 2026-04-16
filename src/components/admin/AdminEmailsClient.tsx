'use client'

import { useState } from 'react'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'

interface TemplateConfig {
  id: string
  title: string
  description: string
  variables: string[]
  data: import('@/lib/actions/emailTemplates').EmailTemplate | null
  defaultSujet: string
  masseSendable?: boolean
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

export default function AdminEmailsClient({ sections }: { sections: Section[] }) {
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

      {/* Description de la section */}
      {activeSection && (
        <>
          <p className="text-sm text-gray-500 mb-4">{activeSection.description}</p>
          <AdminEmailsAccordion templates={activeSection.templates} />
        </>
      )}
    </div>
  )
}
