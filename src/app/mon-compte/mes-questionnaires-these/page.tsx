'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { ExternalLink, Plus, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { QuestionnaireThese } from '@/lib/actions/questionnaires-these'

const STATUT_CONFIG = {
  en_attente: { label: 'En attente de validation', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  publie: { label: 'Publié', icon: CheckCircle, className: 'text-green-600 bg-green-50' },
  refuse: { label: 'Refusé', icon: XCircle, className: 'text-red-600 bg-red-50' },
}

export default function MesQuestionnairesThesePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireThese[]>([])
  const [fetching, setFetching] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/connexion'); return }

    const load = async () => {
      try {
        const { getMesQuestionnaires } = await import('@/lib/actions/questionnaires-these')
        const data = await getMesQuestionnaires()
        setQuestionnaires(data)
      } finally {
        setFetching(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const { supprimerQuestionnaire } = await import('@/lib/actions/questionnaires-these')
      await supprimerQuestionnaire(id)
      setQuestionnaires((prev) => prev.filter((q) => q.id !== id))
    })
  }

  if (loading || fetching) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy">Mes questionnaires de thèse</h1>
        <Link
          href="/mon-compte/proposer/questionnaire-these"
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Déposer un questionnaire
        </Link>
      </div>

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Vous n&apos;avez encore déposé aucun questionnaire.</p>
          <Link
            href="/mon-compte/proposer/questionnaire-these"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Déposer un questionnaire
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {questionnaires.map((q) => {
            const cfg = STATUT_CONFIG[q.statut]
            const StatusIcon = cfg.icon
            return (
              <div key={q.id} className="bg-white rounded-card shadow-card p-5 flex items-start gap-4">
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt={q.titre}
                    className="w-16 h-16 object-cover rounded-xl shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm">{q.titre}</p>
                  {q.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{q.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <a
                      href={q.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Voir le questionnaire
                    </a>
                  </div>
                </div>
                {q.statut === 'en_attente' && (
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={isPending}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
