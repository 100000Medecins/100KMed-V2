'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { attachSolutionToEditeur, detachSolutionFromEditeur } from '@/lib/actions/admin'

export type SolutionLite = { id: string; nom: string | null; actif: boolean | null }

interface Props {
  editeurId: string
  solutionsLiees: SolutionLite[]
  solutionsSansEditeur: SolutionLite[]
}

export default function EditeurSolutionsManager({
  editeurId,
  solutionsLiees,
  solutionsSansEditeur,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState('')

  const handleAttach = () => {
    if (!selected) return
    startTransition(async () => {
      await attachSolutionToEditeur(selected, editeurId)
      setSelected('')
      router.refresh()
    })
  }

  const handleDetach = (solutionId: string) => {
    startTransition(async () => {
      await detachSolutionFromEditeur(solutionId, editeurId)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-sm font-semibold text-navy mb-4">
        Solutions liées ({solutionsLiees.length})
      </h2>

      {solutionsLiees.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">Aucune solution liée.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {solutionsLiees.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 group">
              <span className={`text-sm flex-1 min-w-0 truncate ${s.actif ? 'text-navy' : 'text-gray-400 line-through'}`}>
                {s.nom}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/solutions/${s.id}/modifier`}
                  className="text-xs text-accent-blue hover:underline"
                >
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={() => handleDetach(s.id)}
                  disabled={pending}
                  title="Détacher de cet éditeur"
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Sélecteur de solutions sans éditeur */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2">
          Lier une solution sans éditeur
        </p>
        {solutionsSansEditeur.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucune solution disponible.</p>
        ) : (
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={pending}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-blue/20 disabled:opacity-60"
            >
              <option value="">Choisir une solution…</option>
              {solutionsSansEditeur.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}{!s.actif ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAttach}
              disabled={!selected || pending}
              title="Lier la solution sélectionnée à cet éditeur"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {pending ? '…' : 'Lier'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
