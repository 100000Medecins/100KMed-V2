'use client'

import { useEffect, useState, useTransition } from 'react'
import { History, X, RotateCcw } from 'lucide-react'
import { restorePageStatique } from '@/lib/actions/admin'

export interface HistoryEntry {
  id: string
  saved_at: string
  titre: string | null
  contenu: string | null
  meta_description: string | null
}

interface PageHistoryModalProps {
  pageId: string
  /** Liste des versions historisées chargée côté serveur (la plus récente d'abord). */
  history: HistoryEntry[]
  onClose: () => void
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function PageHistoryModal({
  pageId,
  history,
  onClose,
}: PageHistoryModalProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ESC ferme
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleRestore(entry: HistoryEntry) {
    if (
      !confirm(
        `Restaurer la version du ${formatDateTime(entry.saved_at)} ?\n\nLa version actuelle sera également archivée — vous pourrez la restaurer ensuite si besoin.`
      )
    )
      return
    setError(null)
    setPending((p) => ({ ...p, [entry.id]: true }))
    startTransition(async () => {
      const res = await restorePageStatique(pageId, entry.id)
      if (res?.error) {
        setError(res.error)
        setPending((p) => ({ ...p, [entry.id]: false }))
      } else {
        // Reload pour repartir sur la nouvelle version
        window.location.reload()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy">Historique des versions</h2>
              <p className="text-xs text-gray-400">
                {history.length} version{history.length > 1 ? 's' : ''} archivée
                {history.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">
              {error}
            </div>
          )}
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              Aucune version archivée pour cette page. Les versions seront
              enregistrées automatiquement à chaque sauvegarde.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((entry) => {
                const isPending = !!pending[entry.id]
                const snippet = stripHtml(entry.contenu)
                const contentLen = entry.contenu?.length ?? 0
                return (
                  <li
                    key={entry.id}
                    className="border border-gray-200 rounded-xl p-3 hover:border-accent-blue/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy">
                          {formatDateTime(entry.saved_at)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Titre : <span className="text-gray-600">{entry.titre || '(vide)'}</span>
                          {' · '}
                          {contentLen.toLocaleString('fr-FR')} caractère
                          {contentLen > 1 ? 's' : ''}
                        </p>
                        {snippet && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                            {snippet.slice(0, 240)}
                            {snippet.length > 240 ? '…' : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRestore(entry)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isPending ? 'Restauration…' : 'Restaurer'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex-shrink-0">
          La version actuelle est automatiquement archivée à chaque
          modification : restaurer une version ancienne ne fait jamais perdre la
          version courante.
        </div>
      </div>
    </div>
  )
}
