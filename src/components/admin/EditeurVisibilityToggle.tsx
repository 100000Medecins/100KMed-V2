'use client'

import { useState, useTransition } from 'react'
import { toggleEditeurAfficheSurIndex } from '@/lib/actions/admin'

/**
 * Toggle on/off de la visibilité publique d'un éditeur (champ `affiche_sur_index`),
 * pilotable directement depuis la liste admin. Mise à jour optimiste + rollback
 * si la server action échoue.
 */
export default function EditeurVisibilityToggle({
  id,
  initial,
}: {
  id: string
  initial: boolean
}) {
  const [on, setOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const next = !on
    setOn(next) // optimiste
    startTransition(async () => {
      const res = await toggleEditeurAfficheSurIndex(id, next)
      if (res && 'error' in res && res.error) {
        setOn(!next) // rollback
        window.alert(`Impossible de modifier la visibilité : ${res.error}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Visible sur la page publique /editeurs"
        disabled={pending}
        onClick={handleToggle}
        title={
          on
            ? 'Visible sur /editeurs — cliquer pour masquer'
            : 'Masqué — cliquer pour afficher'
        }
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 ${
          on ? 'bg-rating-green' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span
        className={`text-xs font-medium ${on ? 'text-green-600' : 'text-gray-400'}`}
      >
        {on ? 'Visible' : 'Masqué'}
      </span>
    </div>
  )
}
