'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SolutionResult {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  categorie: { slug: string | null } | null
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SolutionResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recherche avec debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const timeout = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('solutions')
        .select('id, nom, slug, logo_url, categorie:categories(slug)')
        .ilike('nom', `%${query}%`)
        .order('nom', { ascending: true })
        .limit(8)

      setResults((data as unknown as SolutionResult[]) || [])
      setOpen(true)
      setActiveIndex(-1)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const navigateToSolution = (sol: SolutionResult) => {
    const catSlug = sol.categorie?.slug
    if (catSlug && sol.slug) {
      router.push(`/solutions/${catSlug}/${sol.slug}`)
      setOpen(false)
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigateToSolution(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Recherchez un outil"
        className="w-full pl-5 pr-14 py-4 rounded-full bg-white shadow-card border border-gray-100 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-all"
      />
      <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-navy flex items-center justify-center hover:bg-navy-dark transition-colors">
        <Search className="w-4 h-4 text-white" />
      </button>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden z-50">
          {results.map((sol, i) => (
            <button
              key={sol.id}
              onClick={() => navigateToSolution(sol)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === activeIndex ? 'bg-surface-light' : 'hover:bg-surface-light'
              }`}
            >
              {sol.logo_url ? (
                <img
                  src={sol.logo_url}
                  alt={sol.nom}
                  className="w-8 h-8 rounded-lg object-contain bg-surface-light p-1 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-xs shrink-0">
                  {sol.nom.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-navy">{sol.nom}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-card-hover border border-gray-100 z-50 px-4 py-3">
          <p className="text-sm text-gray-400">Aucun résultat pour &laquo; {query} &raquo;</p>
        </div>
      )}
    </div>
  )
}
