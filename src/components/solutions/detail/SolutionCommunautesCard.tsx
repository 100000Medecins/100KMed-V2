'use client'

import { useState } from 'react'
import { Users, ExternalLink, MessageCircle, MessageSquare, Hash, Facebook, Globe, Plus } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import type { CommunautePublique } from '@/lib/db/solution-communautes'
import ProposeCommunauteModal from './ProposeCommunauteModal'

const TYPE_META: Record<string, { label: string; Icon: typeof MessageCircle; color: string }> = {
  whatsapp:  { label: 'WhatsApp',  Icon: MessageCircle, color: 'text-green-600 bg-green-50' },
  telegram:  { label: 'Telegram',  Icon: MessageSquare, color: 'text-sky-600 bg-sky-50' },
  discord:   { label: 'Discord',   Icon: Hash,          color: 'text-indigo-600 bg-indigo-50' },
  facebook:  { label: 'Facebook',  Icon: Facebook,      color: 'text-blue-600 bg-blue-50' },
  forum:     { label: 'Forum',     Icon: Globe,         color: 'text-amber-600 bg-amber-50' },
  autre:     { label: 'Autre',     Icon: Globe,         color: 'text-gray-600 bg-gray-50' },
}

export default function SolutionCommunautesCard({
  solutionId,
  solutionNom,
  communautes,
}: {
  solutionId: string
  solutionNom: string
  communautes: CommunautePublique[]
}) {
  const { user } = useAuth()
  const userEmail = user?.email ?? null
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <section className="bg-white rounded-card shadow-card overflow-hidden">
        {communautes.length === 0 ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <Users className="w-4 h-4 text-accent-blue shrink-0" />
            <p className="text-xs text-gray-500 flex-1 min-w-0">
              Vous connaissez un groupe d&apos;utilisateurs de <strong>{solutionNom}</strong> (WhatsApp, Discord, forum…) ?
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Proposer
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent-blue shrink-0" />
              <h3 className="text-xs font-semibold text-navy">Communauté autour de {solutionNom}</h3>
            </div>
            <ul className="divide-y divide-gray-50">
              {communautes.map((c) => {
                const meta = TYPE_META[c.type] ?? TYPE_META.autre
                const Icon = meta.Icon
                return (
                  <li key={c.id}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy truncate">{c.nom}</p>
                        {c.description && (
                          <p className="text-[11px] text-gray-500 truncate">{c.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{meta.label}</span>
                      <ExternalLink className="w-3 h-3 text-gray-300 shrink-0" />
                    </a>
                  </li>
                )
              })}
            </ul>
            <div className="px-4 py-2 border-t border-gray-50 text-center">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue hover:underline"
              >
                <Plus className="w-3 h-3" />
                Proposer un autre groupe
              </button>
            </div>
          </>
        )}
      </section>

      <ProposeCommunauteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        solutionId={solutionId}
        solutionNom={solutionNom}
        userEmail={userEmail}
      />
    </>
  )
}
