'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, Search, Lightbulb } from 'lucide-react'

type Acronyme = {
  id: string
  sigle: string
  definition: string
  description: string | null
  lien: string | null
}

function linkifyText(text: string, siglesCourant: string, regex: RegExp): React.ReactNode[] {
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (i % 2 === 1 && part !== siglesCourant) {
      return (
        <a key={i} href={`#${part}`} className="text-accent-blue hover:underline font-medium">
          {part}
        </a>
      )
    }
    return part
  })
}

export default function GlossaireClient({ acronymes, letters }: { acronymes: Acronyme[]; letters: string[] }) {
  const [search, setSearch] = useState('')

  const siglesRegex = useMemo(() => {
    const escaped = acronymes.map(a => a.sigle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g')
  }, [acronymes])

  const filtered = search.trim()
    ? acronymes.filter(a =>
        a.sigle.toLowerCase().includes(search.toLowerCase()) ||
        a.definition.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      )
    : acronymes

  const activeLetters = Array.from(new Set(filtered.map(a => a.sigle[0].toUpperCase()))).sort()

  return (
    <div className="space-y-6">
      {/* Barre de recherche + bouton proposer */}
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un acronyme ou une définition…"
            className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
        </div>
        <a
          href="#proposer"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-accent-blue border border-accent-blue/25 rounded-2xl bg-white shadow-sm hover:bg-accent-blue/5 transition-colors whitespace-nowrap"
        >
          <Lightbulb className="w-4 h-4" />
          Ajouter un acronyme
        </a>
      </div>

      {/* Ancres alphabétiques (sans recherche active) */}
      {!search && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {letters.map(l => (
            <a
              key={l}
              href={`#lettre-${l}`}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-white shadow-sm text-navy hover:bg-accent-blue hover:text-white transition-colors"
            >
              {l}
            </a>
          ))}
        </div>
      )}

      {/* Résultats */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">Aucun résultat pour &laquo; {search} &raquo;</p>
      ) : search ? (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50">
          {filtered.map(a => (
            <AcronymeRow key={a.id} a={a} siglesRegex={siglesRegex} />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {activeLetters.map(letter => (
            <div key={letter} id={`lettre-${letter}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-extrabold text-navy">{letter}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-gray-50">
                {filtered.filter(a => a.sigle[0].toUpperCase() === letter).map(a => (
                  <AcronymeRow key={a.id} a={a} siglesRegex={siglesRegex} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AcronymeRow({ a, siglesRegex }: { a: Acronyme; siglesRegex: RegExp }) {
  return (
    <div id={a.sigle} className="flex items-start gap-4 px-5 py-4 scroll-mt-24">
      <span className="text-sm font-extrabold text-navy w-24 shrink-0 pt-0.5">{a.sigle}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          {linkifyText(a.definition, a.sigle, new RegExp(siglesRegex.source, 'g'))}
        </p>
        {a.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {linkifyText(a.description, a.sigle, new RegExp(siglesRegex.source, 'g'))}
          </p>
        )}
        {a.lien && (
          <a href={a.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1">
            <ExternalLink className="w-3 h-3" /> En savoir plus
          </a>
        )}
      </div>
    </div>
  )
}
