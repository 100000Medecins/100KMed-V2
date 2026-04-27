'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { ExternalLink, GraduationCap, CalendarDays, X, ZoomIn, BookOpen } from 'lucide-react'
import type { QuestionnaireThese } from '@/lib/actions/questionnaires-these'
import { sanitizeHtml } from '@/lib/sanitize'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

const DESCRIPTION_MAX_CHARS = 160

export default function QuestionnairesThesePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireThese[]>([])
  const [fetching, setFetching] = useState(true)
  const [modalQ, setModalQ] = useState<QuestionnaireThese | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/connexion'); return }

    const load = async () => {
      try {
        const { getQuestionnairesPublies } = await import('@/lib/actions/questionnaires-these')
        setQuestionnaires(await getQuestionnairesPublies())
      } finally {
        setFetching(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  // Escape pour fermer modale / zoom
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImage) { setZoomedImage(null); return }
        if (modalQ) setModalQ(null)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [modalQ, zoomedImage])

  if (loading || fetching) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-accent-blue" />
          <div>
            <h1 className="text-xl font-bold text-navy">Questionnaires de thèse sur l&apos;e-santé</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Soutenez vos confrères étudiants en répondant à leurs questionnaires.
            </p>
          </div>
        </div>
        <a
          href="/mon-compte/mes-questionnaires-these"
          className="hidden sm:flex shrink-0 items-center gap-2 px-4 py-2.5 bg-accent-blue/10 text-accent-blue text-sm font-medium rounded-xl hover:bg-accent-blue/20 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Proposer un questionnaire
        </a>
      </div>

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucun questionnaire disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {questionnaires.map((q) => (
            <QuestionnaireCard key={q.id} q={q} onExpand={() => setModalQ(q)} />
          ))}
        </div>
      )}

      {/* Bouton "Proposer" — mobile uniquement, en bas */}
      <a
        href="/mon-compte/mes-questionnaires-these"
        className="sm:hidden mt-5 flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue/10 text-accent-blue text-sm font-medium rounded-xl hover:bg-accent-blue/20 transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        Proposer un questionnaire
      </a>

      {/* Modale détail */}
      {modalQ && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalQ(null)}
        >
          <div
            className="bg-white rounded-card shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-navy text-lg leading-snug">{modalQ.titre}</h2>
                <button
                  onClick={() => setModalQ(null)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description complète */}
              {modalQ.description && (
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(modalQ.description) }}
                />
              )}

              {/* Image cliquable pour zoom */}
              {modalQ.image_url && (
                <button
                  type="button"
                  onClick={() => setZoomedImage(modalQ.image_url!)}
                  className="relative group block w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
                >
                  <img
                    src={modalQ.image_url}
                    alt={modalQ.titre}
                    className="w-full object-contain max-h-72"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                  </div>
                </button>
              )}

              {/* Footer */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                {modalQ.date_fin && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Jusqu&apos;au {new Date(modalQ.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <a
                  href={modalQ.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-semibold rounded-xl hover:bg-accent-blue/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Répondre au questionnaire
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom image plein écran */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImage}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function QuestionnaireCard({ q, onExpand }: { q: QuestionnaireThese; onExpand: () => void }) {
  const plainText = q.description ? stripHtml(q.description) : ''
  const isTruncated = plainText.length > DESCRIPTION_MAX_CHARS
  const truncated = isTruncated ? plainText.slice(0, DESCRIPTION_MAX_CHARS) + '…' : plainText

  return (
    <div
      className="bg-white rounded-card shadow-card overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onExpand}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Titre */}
        <h2 className="font-bold text-navy text-sm leading-snug">{q.titre}</h2>

        {/* Description tronquée */}
        {plainText && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {truncated}
            {isTruncated && (
              <span className="text-accent-blue font-medium ml-1">Voir plus</span>
            )}
          </p>
        )}

        {/* Image en dessous du texte — contain pour ne pas couper */}
        {q.image_url && (
          <div className="w-full bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            <img
              src={q.image_url}
              alt={q.titre}
              className="w-full object-contain max-h-52"
            />
          </div>
        )}

        {/* Date de fin */}
        {q.date_fin && (
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <CalendarDays className="w-3 h-3" />
            Jusqu&apos;au {new Date(q.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        {/* Lien */}
        <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={q.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-semibold rounded-xl hover:bg-accent-blue/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Répondre au questionnaire
          </a>
        </div>
      </div>
    </div>
  )
}
