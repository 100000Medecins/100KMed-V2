'use client'

import { deleteEditeur } from '@/lib/actions/admin'

export default function DeleteEditeurButton({ id, nom }: { id: string; nom: string | null }) {
  async function handleDelete() {
    if (!window.confirm(`Supprimer l'éditeur « ${nom} » ?`)) return
    await deleteEditeur(id)
  }

  return (
    <button
      onClick={handleDelete}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      Supprimer
    </button>
  )
}
