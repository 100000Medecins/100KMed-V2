'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteVideo } from '@/lib/actions/admin'

export default function DeleteVideoButton({ id, titre }: { id: string; titre: string | null }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (confirm) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => startTransition(async () => { await deleteVideo(id) })}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? '…' : 'Confirmer'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs px-2 py-1 rounded border text-gray-500">
          Annuler
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Supprimer "${titre}"`}
      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Supprimer
    </button>
  )
}
