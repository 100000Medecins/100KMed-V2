'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

export interface EditeurCard {
  slug: string
  nom: string
  nom_commercial: string | null
  logo_url: string | null
  description: string | null
  nb_solutions: number
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function EditeursListClient({ editeurs }: { editeurs: EditeurCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = norm(search.trim())
    if (!q) return editeurs
    return editeurs.filter((e) => {
      const haystack = norm(
        `${e.nom_commercial ?? ''} ${e.nom} ${e.description ? stripHtml(e.description) : ''}`
      )
      return haystack.includes(q)
    })
  }, [editeurs, search])

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un éditeur, une marque, une description…"
            className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
        </div>
      </div>

      {/* Liste des éditeurs */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <p className="text-gray-500 text-sm">
            Aucun éditeur ne correspond à votre recherche.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((ed) => {
            const displayName = ed.nom_commercial || ed.nom
            const descSnippet = ed.description
              ? stripHtml(ed.description).slice(0, 130)
              : null
            return (
              <li key={ed.slug}>
                <Link
                  href={`/editeur/${ed.slug}`}
                  className="flex items-start gap-4 bg-white rounded-card shadow-card p-4 hover:shadow-md hover:border-accent-blue/30 border border-transparent transition-all"
                >
                  {ed.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ed.logo_url}
                      alt={displayName}
                      className="w-14 h-14 rounded-xl object-contain bg-surface-light p-1.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-base flex-shrink-0">
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy text-sm leading-tight">
                      {displayName}
                    </p>
                    {descSnippet && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {descSnippet}
                        {ed.description &&
                        stripHtml(ed.description).length > 130
                          ? '…'
                          : ''}
                      </p>
                    )}
                    {ed.nb_solutions > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {ed.nb_solutions} solution
                        {ed.nb_solutions > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
