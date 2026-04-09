'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteArticle } from '@/lib/actions/admin'

export default function DeleteArticleButton({ id, titre }: { id: string; titre: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={() => startTransition(() => deleteArticle(id))}
          disabled={isPending}
          className="px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? '...' : 'Confirmer'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Annuler
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
      title={`Supprimer "${titre}"`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
