'use client'

import { Trash2 } from 'lucide-react'
import { deleteCategorie } from '@/lib/actions/admin'

export default function DeleteCategorieButton({ categorieId, nom }: { categorieId: string; nom: string }) {
  async function handleDelete() {
    if (!window.confirm(`Supprimer la catégorie « ${nom} » ? Cette action est irréversible.`)) return
    const result = await deleteCategorie(categorieId)
    if (result?.needsForce) {
      if (window.confirm(result.error + '\n\nLes solutions seront détachées de cette catégorie.')) {
        const forceResult = await deleteCategorie(categorieId, true)
        if (forceResult?.error) alert(forceResult.error)
      }
    } else if (result?.error) {
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
