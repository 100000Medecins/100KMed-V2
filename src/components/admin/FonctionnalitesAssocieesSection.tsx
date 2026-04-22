'use client'

import { useState, useTransition } from 'react'
import { toggleTagAssociation } from '@/lib/actions/admin'
import type { TagForSolution } from '@/lib/db/admin-solutions'

interface FonctionnalitesAssocieesSectionProps {
  solutionId: string
  initialTags: TagForSolution[]
}

export default function FonctionnalitesAssocieesSection({
  solutionId,
  initialTags,
}: FonctionnalitesAssocieesSectionProps) {
  const [tags, setTags] = useState(initialTags)
  const [isPending, startTransition] = useTransition()

  function handleToggle(tagId: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled
    // Mise à jour optimiste
    setTags((prev) => {
      const updated = prev.map((t) => {
        if (t.id === tagId) return { ...t, enabled: newEnabled }
            // Si on active un tag, activer aussi ses parents ("valide aussi")
        if (newEnabled) {
          const toggled = prev.find((x) => x.id === tagId)
          if (toggled?.parent_ids.includes(t.id)) {
            return { ...t, enabled: true }
          }
        }
        return t
      })
      return updated
    })
    startTransition(async () => {
      await toggleTagAssociation(solutionId, tagId, newEnabled)
      // Après l'action serveur, rafraîchir les tags depuis le serveur
      // (les ancêtres ont peut-être été auto-activés)
    })
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Aucune fonctionnalité définie pour cette catégorie. Ajoutez-en depuis la page d&apos;édition de la catégorie.
      </p>
    )
  }

  // Calculer les tags "impliqués" : parents (au sens "valide aussi") des tags actifs
  const impliedParentIds = new Set<string>()
  for (const tag of tags) {
    if (tag.enabled) {
      for (const pid of tag.parent_ids) {
        impliedParentIds.add(pid)
      }
    }
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => {
        const isImplied = impliedParentIds.has(tag.id) && !tag.enabled
        const hasChildren = tags.some((t) => t.parent_ids.includes(tag.id))
        return (
          <div
            key={tag.id}
            className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${
              hasChildren ? 'bg-surface-light' : 'ml-4 bg-gray-50'
            }`}
          >
            {!hasChildren && (
              <span className="text-gray-300 text-xs flex-shrink-0">└</span>
            )}
            <span
              className={`text-sm flex-1 ${
                isImplied ? 'text-gray-400' : 'text-navy'
              }`}
            >
              {tag.libelle}
              {isImplied && (
                <span className="ml-2 text-xs text-gray-400 italic">(inclus automatiquement)</span>
              )}
            </span>

            <button
              type="button"
              disabled={isPending || isImplied}
              onClick={() => handleToggle(tag.id, tag.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 disabled:opacity-50 ${
                tag.enabled || isImplied ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={
                isImplied
                  ? 'Inclus automatiquement (enfant actif)'
                  : tag.enabled
                  ? 'Dissocier'
                  : 'Associer'
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  tag.enabled || isImplied ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 mt-1">
        Les fonctionnalités associées permettent le filtrage sur la page comparatif.
        Cocher une fonctionnalité &quot;enfant&quot; active automatiquement son parent.
      </p>
    </div>
  )
}
