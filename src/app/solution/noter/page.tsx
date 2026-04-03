'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

interface SolutionItem {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  categorie: { slug: string | null; nom: string } | null
}

export default function ChoisirSolutionPage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const [solutions, setSolutions] = useState<SolutionItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    const supabase = createClient()
    supabase
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories(slug, nom)')
      .order('nom', { ascending: true })
      .then(({ data }) => {
        setSolutions((data as unknown as SolutionItem[]) || [])
        setLoading(false)
      })
  }, [authLoading])

  const filtered = search.trim()
    ? solutions.filter((s) =>
        s.nom.toLowerCase().includes(search.toLowerCase())
      )
    : solutions

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="text-xl font-bold text-navy mb-2">
            Évaluer un logiciel
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Sélectionnez le logiciel que vous souhaitez évaluer.
          </p>

          {/* Barre de recherche */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un logiciel..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white"
            />
          </div>

          {/* Liste des solutions */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-card shadow-card p-8 text-center">
                <p className="text-gray-500 text-sm">
                  {search ? 'Aucun logiciel trouvé.' : 'Aucun logiciel disponible.'}
                </p>
              </div>
            ) : (
              filtered.map((sol) => (
                <button
                  key={sol.id}
                  onClick={() => {
                    const catSlug = sol.categorie?.slug
                    const solSlug = sol.slug
                    if (catSlug && solSlug) {
                      router.push(`/solution/noter/${catSlug}/${solSlug}`)
                    }
                  }}
                  className="w-full flex items-center gap-4 bg-white rounded-card shadow-card p-4 hover:shadow-md hover:border-accent-blue/20 border border-transparent transition-all text-left"
                >
                  {sol.logo_url ? (
                    <img
                      src={sol.logo_url}
                      alt={sol.nom}
                      className="w-10 h-10 rounded-xl object-contain bg-surface-light p-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-sm flex-shrink-0">
                      {sol.nom.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-navy text-sm">{sol.nom}</p>
                    {sol.categorie?.nom && (
                      <p className="text-xs text-gray-400">{sol.categorie.nom}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
