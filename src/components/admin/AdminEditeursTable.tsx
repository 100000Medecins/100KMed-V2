'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, Pencil, ExternalLink } from 'lucide-react'
import DeleteEditeurButton from '@/components/admin/DeleteEditeurButton'
import EditeurVisibilityToggle from '@/components/admin/EditeurVisibilityToggle'
import type { Editeur } from '@/types/models'

function isIncomplet(ed: Editeur): boolean {
  return !ed.description && !ed.website && !ed.logo_url
}

export default function AdminEditeursTable({ editeurs }: { editeurs: Editeur[] }) {
  const [query, setQuery] = useState('')
  const [filterIncomplet, setFilterIncomplet] = useState(false)

  const nbIncomplets = useMemo(() => editeurs.filter(isIncomplet).length, [editeurs])

  const filtered = editeurs
    .filter((ed) => !filterIncomplet || isIncomplet(ed))
    .filter((ed) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        (ed.nom?.toLowerCase().includes(q) ?? false) ||
        (ed.nom_commercial?.toLowerCase().includes(q) ?? false) ||
        (ed.website?.toLowerCase().includes(q) ?? false)
      )
    })

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtre à compléter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, site web…"
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
        <button
          type="button"
          onClick={() => setFilterIncomplet((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
            filterIncomplet
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
          }`}
          title={`${nbIncomplets} éditeur${nbIncomplets > 1 ? 's' : ''} sans logo, description ni site web`}
        >
          À compléter
          <span
            className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              filterIncomplet ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {nbIncomplets}
          </span>
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-light border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Éditeur</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Visible</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500 hidden lg:table-cell">Site web</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((ed) => (
              <tr key={ed.id} className="hover:bg-surface-light transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {ed.logo_url ? (
                      <img
                        src={ed.logo_url}
                        alt={ed.logo_titre || ed.nom || ''}
                        className="h-8 w-16 object-contain rounded bg-gray-50 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-16 rounded bg-gray-100 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-navy">{ed.nom_commercial || ed.nom}</p>
                        {isIncomplet(ed) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                            À compléter
                          </span>
                        )}
                      </div>
                      {ed.nom_commercial && ed.nom && (
                        <p className="text-xs text-gray-400">{ed.nom}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <EditeurVisibilityToggle id={ed.id} initial={ed.affiche_sur_index} />
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  {ed.website ? (
                    <a
                      href={ed.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {(() => { try { return new URL(ed.website!).hostname } catch { return ed.website } })()}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/editeurs/${ed.id}/modifier`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </Link>
                    <DeleteEditeurButton id={ed.id} nom={ed.nom_commercial || ed.nom} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                  {query || filterIncomplet ? 'Aucun éditeur ne correspond.' : "Aucun éditeur pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(query || filterIncomplet) && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length} / {editeurs.length} éditeur{editeurs.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
