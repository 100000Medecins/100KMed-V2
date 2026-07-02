'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lightbulb, AlertTriangle, Video, BookOpen, FileText, Quote } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

const allTabs = [
  { href: '/mon-compte/proposer/idee', label: 'Une idée', icon: Lightbulb },
  { href: '/mon-compte/proposer/correction', label: 'Une correction', icon: AlertTriangle },
  { href: '/mon-compte/proposer/video', label: 'Une vidéo', icon: Video },
  { href: '/mon-compte/proposer/acronyme', label: 'Un acronyme', icon: BookOpen },
  { href: '/mon-compte/proposer/citation', label: 'Une citation', icon: Quote },
  { href: '/mon-compte/proposer/questionnaire-these', label: 'Un questionnaire de thèse', icon: FileText },
]

export default function ProposerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isEditeur } = useAuth()
  // L'onglet « questionnaire de thèse » (objet académique) est masqué pour les éditeurs.
  const tabs = isEditeur
    ? allTabs.filter((t) => t.href !== '/mon-compte/proposer/questionnaire-these')
    : allTabs
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-2">Proposer</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isEditeur
          ? 'Une idée, une correction, une vidéo, un acronyme à ajouter au glossaire — tout est bon à prendre.'
          : 'Une idée, une correction, une vidéo, un acronyme à ajouter au glossaire, un questionnaire de thèse à diffuser — tout est bon à prendre.'}
      </p>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
