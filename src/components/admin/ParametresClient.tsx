'use client'

import { useState, useTransition } from 'react'
import { Euro, Loader2, Briefcase } from 'lucide-react'
import { setDisplayPrixFront, setDisplayContactsCommerciaux } from '@/lib/actions/admin'

interface ParametresClientProps {
  initialDisplayPrixFront: boolean
  initialDisplayContactsCommerciaux: boolean
}

export default function ParametresClient({
  initialDisplayPrixFront,
  initialDisplayContactsCommerciaux,
}: ParametresClientProps) {
  const [displayPrixFront, setLocal] = useState(initialDisplayPrixFront)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [displayContacts, setLocalContacts] = useState(initialDisplayContactsCommerciaux)
  const [pendingContacts, startTransitionContacts] = useTransition()
  const [errorContacts, setErrorContacts] = useState<string | null>(null)

  function handleToggle(next: boolean) {
    setError(null)
    setLocal(next) // optimistic
    startTransition(async () => {
      const res = await setDisplayPrixFront(next)
      if (res?.error) {
        setError(res.error)
        setLocal(!next)
      }
    })
  }

  function handleToggleContacts(next: boolean) {
    setErrorContacts(null)
    setLocalContacts(next) // optimistic
    startTransitionContacts(async () => {
      const res = await setDisplayContactsCommerciaux(next)
      if (res?.error) {
        setErrorContacts(res.error)
        setLocalContacts(!next)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Affichage des prix sur le front */}
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Euro className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-navy">Afficher les prix sur le site public</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-xl">
                  Quand ce réglage est activé, les prix renseignés par les éditeurs apparaissent sur les fiches solutions
                  (« À partir de … €/mois TTC ») et l&apos;indicateur €/€€/€€€/€€€€ s&apos;affiche sur les cartes du comparatif.
                  Laisser sur OFF tant qu&apos;une masse critique de prix n&apos;est pas renseignée — un affichage partiel
                  pourrait donner l&apos;impression que les solutions sans prix sont louches.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(!displayPrixFront)}
                disabled={pending}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                  displayPrixFront ? 'bg-accent-blue' : 'bg-gray-300'
                } disabled:opacity-60`}
                role="switch"
                aria-checked={displayPrixFront}
                aria-label="Afficher les prix sur le front"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    displayPrixFront ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                  displayPrixFront
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${displayPrixFront ? 'bg-green-500' : 'bg-gray-400'}`} />
                {displayPrixFront ? 'Activé — prix visibles sur le site' : 'Désactivé — prix masqués'}
              </span>
              {pending && (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enregistrement…
                </span>
              )}
            </div>

            {error && (
              <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}
          </div>
        </div>
      </div>

      {/* Affichage du bloc "Contacts commerciaux" sur les fiches solutions */}
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-navy">Afficher les contacts commerciaux des éditeurs</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-xl">
                  Affiche sur chaque fiche solution le bloc « Contacts commerciaux » (email et téléphone pour demande de démo/devis) si l&apos;éditeur les a renseignés.
                  Masqué par défaut : beaucoup de coordonnées en BDD sont incorrectes ou inappropriées. Le bloc « Contacts support » (SAV) reste toujours affiché s&apos;il est renseigné.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleContacts(!displayContacts)}
                disabled={pendingContacts}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                  displayContacts ? 'bg-accent-blue' : 'bg-gray-300'
                } disabled:opacity-60`}
                role="switch"
                aria-checked={displayContacts}
                aria-label="Afficher les contacts commerciaux"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    displayContacts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                  displayContacts
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${displayContacts ? 'bg-green-500' : 'bg-gray-400'}`} />
                {displayContacts ? 'Activé — contacts commerciaux visibles' : 'Désactivé — contacts commerciaux masqués'}
              </span>
              {pendingContacts && (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enregistrement…
                </span>
              )}
            </div>

            {errorContacts && (
              <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{errorContacts}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
