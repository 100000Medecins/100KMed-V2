'use client'

import { useTransition } from 'react'
import { toggleCategorieActif } from '@/lib/actions/admin'

interface ToggleCategorieActifProps {
  categorieId: string
  actif: boolean
}

export default function ToggleCategorieActif({ categorieId, actif }: ToggleCategorieActifProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleCategorieActif(categorieId, !actif)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 disabled:opacity-50 ${
        actif ? 'bg-green-500' : 'bg-gray-300'
      }`}
      title={actif ? 'Désactiver' : 'Activer'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          actif ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
