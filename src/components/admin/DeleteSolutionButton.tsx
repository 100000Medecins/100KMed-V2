'use client'

import { Trash2 } from 'lucide-react'
import { deleteSolution } from '@/lib/actions/admin'

export default function DeleteSolutionButton({ solutionId, nom }: { solutionId: string; nom: string }) {
  async function handleDelete() {
    if (!window.confirm(`Supprimer « ${nom} » ? Cette action est irréversible.`)) return
    const result = await deleteSolution(solutionId)
    if (result?.error) {
      alert(result.error)
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      title="Supprimer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
