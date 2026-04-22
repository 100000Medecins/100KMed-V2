'use client'

import { useState, useTransition } from 'react'
import { toggleCategorieActif } from '@/lib/actions/admin'

interface ToggleCategorieActifProps {
  categorieId: string
  actif: boolean
  onToggle?: (newValue: boolean) => void
}

export default function ToggleCategorieActif({ categorieId, actif, onToggle }: ToggleCategorieActifProps) {
  const [isPending, startTransition] = useTransition()
  const [localActif, setLocalActif] = useState(actif)

  function handleToggle() {
    const newValue = !localActif
    setLocalActif(newValue)
    onToggle?.(newValue)
    startTransition(async () => {
      await toggleCategorieActif(categorieId, newValue)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 disabled:opacity-50 ${
        localActif ? 'bg-green-500' : 'bg-gray-300'
      }`}
      title={localActif ? 'Désactiver' : 'Activer'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          localActif ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
