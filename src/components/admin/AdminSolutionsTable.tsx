'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Search, X } from 'lucide-react'
import DeleteSolutionButton from '@/components/admin/DeleteSolutionButton'
import ToggleSolutionActif from '@/components/admin/ToggleSolutionActif'

type Solution = {
  id: string
  nom: string
  actif: boolean | null
  categorie?: { id: string; nom: string } | null
  editeur?: { id: string; nom: string } | null
}

export default function AdminSolutionsTable({ solutions }: { solutions: Solution[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? solutions.filter(s =>
        s.nom.toLowerCase().includes(query.toLowerCase()) ||
        s.categorie?.nom.toLowerCase().includes(query.toLowerCase()) ||
        s.editeur?.nom.toLowerCase().includes(query.toLowerCase())
      )
    : solutions

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher par nom, catégorie, éditeur…"
          className="w-full pl-10 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Éditeur</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Actif</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(solution => (
                <tr key={solution.id} id={`solution-${solution.id}`} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-navy text-sm">{solution.nom}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.categorie?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.editeur?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-center hidden md:table-cell">
                    <ToggleSolutionActif solutionId={solution.id} actif={solution.actif ?? true} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/solutions/${solution.id}/modifier`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                      >
                        Éditer
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <DeleteSolutionButton solutionId={solution.id} nom={solution.nom} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {query ? `Aucun résultat pour « ${query} »` : 'Aucune solution pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {query && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
