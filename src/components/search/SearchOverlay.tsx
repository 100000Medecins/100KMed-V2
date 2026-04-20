'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight } from 'lucide-react'

type SearchResult = {
  solutions: { id: string; nom: string; slug: string; logo_url: string | null; categorie_nom: string | null; categorie_slug: string | null }[]
  articles: { id: string; titre: string; slug: string; extrait: string | null; image_couverture: string | null }[]
  categories: { id: string; nom: string; slug: string; icon: string | null }[]
}

interface SearchOverlayProps {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fermer sur Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  const hasResults = results && (
    results.solutions.length > 0 ||
    results.articles.length > 0 ||
    results.categories.length > 0
  )

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center pt-[72px] px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl mt-4">
        {/* Barre de recherche */}
        <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-2xl shadow-2xl px-4 py-3 gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Rechercher une solution, un article, une catégorie..."
            className="flex-1 text-base text-navy placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus() }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {query.trim().length >= 2 && (
            <button type="submit" className="shrink-0 bg-navy text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-navy/90 transition-colors">
              Voir tout
            </button>
          )}
        </form>

        {/* Résultats */}
        {(loading || hasResults || (results && !hasResults && query.length >= 2)) && (
          <div className="mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {loading && (
              <div className="px-5 py-4 text-sm text-gray-400">Recherche en cours...</div>
            )}

            {!loading && results && !hasResults && (
              <div className="px-5 py-4 text-sm text-gray-400">Aucun résultat pour « {query} »</div>
            )}

            {!loading && results && hasResults && (
              <div className="divide-y divide-gray-100">
                {/* Solutions */}
                {results.solutions.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">Solutions</p>
                    {results.solutions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/solutions/${s.categorie_slug}/${s.slug}`)}
                        className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-surface-light transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center shrink-0 overflow-hidden">
                          {s.logo_url
                            ? <img src={s.logo_url} alt={s.nom} className="w-full h-full object-contain p-1" />
                            : <span className="text-xs font-bold text-accent-blue">{s.nom.substring(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy truncate">{s.nom}</p>
                          {s.categorie_nom && <p className="text-xs text-gray-400 truncate">{s.categorie_nom}</p>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Catégories */}
                {results.categories.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">Comparatifs</p>
                    {results.categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/solutions/${c.slug}`)}
                        className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-surface-light transition-colors text-left"
                      >
                        {c.icon && <span className="text-lg">{c.icon}</span>}
                        <p className="text-sm font-semibold text-navy">{c.nom}</p>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0 ml-auto" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Articles */}
                {results.articles.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">Articles</p>
                    {results.articles.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => navigate(`/blog/${a.slug}`)}
                        className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-surface-light transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-light shrink-0 overflow-hidden">
                          {a.image_couverture
                            ? <img src={a.image_couverture} alt={a.titre} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-hero-gradient" />
                          }
                        </div>
                        <p className="text-sm font-semibold text-navy truncate flex-1">{a.titre}</p>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Lien voir tout */}
                <button
                  onClick={handleSubmit as unknown as React.MouseEventHandler}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-accent-blue hover:bg-surface-light transition-colors"
                >
                  Voir tous les résultats pour « {query} »
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
