'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'

interface SolutionItem {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  categorie: { slug: string | null; nom: string; icon: string | null; image_url: string | null } | null
}

interface CategorieCard {
  slug: string
  nom: string
  icon: string | null
  image_url: string | null
  count: number
}

export default function ChoisirSolutionPage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const [solutions, setSolutions] = useState<SolutionItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<HTMLDivElement>(null)
  const handleCategorieClick = (slug: string) => {
    const next = selectedCategorie === slug ? null : slug
    setSelectedCategorie(next)
  }

  // À la sélection d'une catégorie, faire défiler jusqu'à la barre de recherche
  // (avec la liste filtrée en dessous) : sinon le clic filtre plus bas sans rien
  // déplacer et l'utilisateur ne voit pas ce qui se passe. Offset pour la navbar fixe.
  useEffect(() => {
    if (!selectedCategorie || !searchRef.current) return
    const y = searchRef.current.getBoundingClientRect().top + window.scrollY - 88
    window.scrollTo({ top: y, behavior: 'smooth' })
  }, [selectedCategorie])

  useEffect(() => {
    if (authLoading) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories!inner(slug, nom, icon, image_url, actif)')
      .eq('actif', true)
      .eq('categorie.actif', true)
      .order('nom', { ascending: true })
      .then(({ data }: { data: any }) => {
        setSolutions((data as unknown as SolutionItem[]) || [])
        setLoading(false)
      })
  }, [authLoading])

  // Construire les cartes de catégories depuis les solutions chargées
  const categories: CategorieCard[] = (() => {
    const map = new Map<string, CategorieCard>()
    for (const s of solutions) {
      const cat = s.categorie
      if (!cat?.slug) continue
      if (!map.has(cat.slug)) {
        map.set(cat.slug, { slug: cat.slug, nom: cat.nom, icon: cat.icon, image_url: cat.image_url, count: 0 })
      }
      map.get(cat.slug)!.count++
    }
    return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom))
  })()

  const filtered = solutions.filter((s) => {
    const matchSearch = !search.trim() || s.nom.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategorie || s.categorie?.slug === selectedCategorie
    return matchSearch && matchCat
  })

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
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 min-[1150px]:pl-[200px]">
          <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Évaluer un logiciel' }]} />
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-extrabold text-navy mb-1">
            Évaluer un logiciel
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Sélectionnez le logiciel que vous souhaitez évaluer.
          </p>

          {/* Cartes de catégories style comparatifs */}
          {categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {categories.map((cat) => {
                const isActive = selectedCategorie === cat.slug
                if (selectedCategorie && !isActive) {
                  return <div key={cat.slug} className="hidden md:block">
                    <button
                      type="button"
                      onClick={() => handleCategorieClick(cat.slug)}
                      className="relative overflow-hidden rounded-3xl min-h-[100px] w-full flex flex-col justify-start p-5 text-left transition-all duration-200 group"
                      style={{ background: 'linear-gradient(135deg, #148080 0%, #7c35c0 55%, #1e4da0 100%)' }}
                    >
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="absolute top-1/2 -translate-y-1/2 right-8 h-[80px] w-auto object-contain opacity-80 group-hover:opacity-100 transition-all duration-300 select-none pointer-events-none" />
                      ) : cat.icon ? (
                        <span className="absolute bottom-3 right-4 text-[80px] leading-none opacity-25 select-none">{cat.icon}</span>
                      ) : null}
                      <span className="text-lg font-extrabold text-white mb-2 leading-snug relative z-10">{cat.nom}</span>
                      <span className="inline-flex items-center gap-1 bg-white/20 text-white font-semibold px-3 py-1.5 rounded-full text-xs w-fit relative z-10">{cat.count} logiciel{cat.count > 1 ? 's' : ''}</span>
                    </button>
                  </div>
                }
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleCategorieClick(cat.slug)}
                    className="relative overflow-hidden rounded-3xl min-h-[100px] flex flex-col justify-start p-5 text-left transition-all duration-200 group"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, #0e7070 0%, #6b2aaa 55%, #1a3f8a 100%)'
                        : 'linear-gradient(135deg, #148080 0%, #7c35c0 55%, #1e4da0 100%)',
                      outline: isActive ? '2px solid rgba(255,255,255,0.6)' : 'none',
                      outlineOffset: '-2px',
                    }}
                  >
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt=""
                        className="absolute top-1/2 -translate-y-1/2 right-8 h-[80px] w-auto object-contain opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 select-none pointer-events-none"
                      />
                    ) : cat.icon ? (
                      <span className="absolute bottom-3 right-4 text-[80px] leading-none opacity-25 group-hover:opacity-40 transition-opacity duration-300 select-none">
                        {cat.icon}
                      </span>
                    ) : null}
                    <span className="text-lg font-extrabold text-white mb-2 leading-snug relative z-10">{cat.nom}</span>
                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white font-semibold px-3 py-1.5 rounded-full text-xs w-fit relative z-10">
                      {cat.count} logiciel{cat.count > 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Barre de recherche */}
          <div ref={searchRef} className="relative mb-4 scroll-mt-24">
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
                  {search || selectedCategorie ? 'Aucun logiciel trouvé.' : 'Aucun logiciel disponible.'}
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
