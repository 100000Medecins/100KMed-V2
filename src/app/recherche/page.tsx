import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface PageProps {
  searchParams: { q?: string }
}

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const q = searchParams.q
  return {
    title: q ? `Recherche "${q}" — 100000médecins.org` : 'Recherche — 100000médecins.org',
  }
}

async function searchAll(query: string) {
  const supabase = createServiceRoleClient()
  const [solutionsRes, articlesRes, categoriesRes] = await Promise.all([
    supabase.rpc('search_solutions', { query, max_results: 20 }),
    supabase.rpc('search_articles', { query, max_results: 10 }),
    supabase.rpc('search_categories', { query, max_results: 6 }),
  ])
  return {
    solutions: solutionsRes.data ?? [],
    articles: articlesRes.data ?? [],
    categories: categoriesRes.data ?? [],
  }
}

export default async function RecherchePage({ searchParams }: PageProps) {
  const q = searchParams.q?.trim() ?? ''
  const results = q.length >= 2 ? await searchAll(q) : null
  const total = results ? results.solutions.length + results.articles.length + results.categories.length : 0

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="bg-hero-gradient py-10 md:py-14">
          <div className="max-w-3xl mx-auto px-6">
            <form method="GET" action="/recherche" className="flex items-center bg-white rounded-2xl shadow-xl px-4 py-3 gap-3">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Rechercher..."
                className="flex-1 text-base text-navy placeholder-gray-400 outline-none bg-transparent"
                autoFocus
              />
              <button type="submit" className="shrink-0 bg-navy text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-navy/90 transition-colors">
                Rechercher
              </button>
            </form>
            {q && results && (
              <p className="text-white/60 text-sm mt-3 px-1">
                {total === 0 ? `Aucun résultat pour « ${q} »` : `${total} résultat${total > 1 ? 's' : ''} pour « ${q} »`}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
          {!q && (
            <p className="text-gray-400 text-center py-12">Saisissez un terme pour lancer la recherche.</p>
          )}

          {results && total === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Aucun résultat trouvé pour « {q} ».</p>
              <p className="text-sm text-gray-400">Essayez avec un terme différent ou parcourez nos <Link href="/comparatifs" className="text-accent-blue hover:underline">comparatifs</Link>.</p>
            </div>
          )}

          {/* Solutions */}
          {results && results.solutions.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-navy mb-4">Solutions ({results.solutions.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.solutions.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/solutions/${s.categorie_slug}/${s.slug}`}
                    className="flex items-center gap-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all p-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-light flex items-center justify-center shrink-0 overflow-hidden">
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.nom} className="w-full h-full object-contain p-1.5" />
                        : <span className="text-sm font-bold text-accent-blue">{s.nom.substring(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy group-hover:text-accent-blue transition-colors truncate">{s.nom}</p>
                      {s.categorie_nom && <p className="text-xs text-gray-400 truncate">{s.categorie_nom}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Catégories */}
          {results && results.categories.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-navy mb-4">Comparatifs ({results.categories.length})</h2>
              <div className="flex flex-wrap gap-3">
                {results.categories.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/solutions/${c.slug}`}
                    className="flex items-center gap-2 bg-white rounded-full shadow-card hover:shadow-card-hover transition-all px-4 py-2"
                  >
                    {c.icon && <span>{c.icon}</span>}
                    <span className="text-sm font-semibold text-navy">{c.nom}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Articles */}
          {results && results.articles.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-navy mb-4">Articles ({results.articles.length})</h2>
              <div className="space-y-4">
                {results.articles.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/blog/${a.slug}`}
                    className="flex items-start gap-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all p-4 group"
                  >
                    <div className="w-16 h-16 rounded-xl bg-surface-light shrink-0 overflow-hidden">
                      {a.image_couverture
                        ? <img src={a.image_couverture} alt={a.titre} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-hero-gradient" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy group-hover:text-accent-blue transition-colors line-clamp-2">{a.titre}</p>
                      {a.extrait && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{a.extrait}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
