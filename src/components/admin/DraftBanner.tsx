'use client'

import { useState } from 'react'
import { History, X } from 'lucide-react'

interface DraftBannerProps {
  /** Timestamp epoch ms de l'autosave (provient du hook useDraft.getDraft()). */
  draftSavedAt: number
  /** Callback : l'utilisateur veut restaurer le brouillon. */
  onRestore: () => void
  /** Callback : l'utilisateur veut ignorer le brouillon (efface localStorage). */
  onDiscard: () => void
}

function formatDateTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function DraftBanner({
  draftSavedAt,
  onRestore,
  onDiscard,
}: DraftBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
        <History className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Vous avez un brouillon non enregistré
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Sauvegardé automatiquement le {formatDateTime(draftSavedAt)}, postérieur
          à la dernière version en base. Voulez-vous le restaurer ?
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={() => {
              onRestore()
              setDismissed(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Restaurer le brouillon
          </button>
          <button
            type="button"
            onClick={() => {
              onDiscard()
              setDismissed(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Ignorer
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Masquer"
        className="text-amber-400 hover:text-amber-700 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
