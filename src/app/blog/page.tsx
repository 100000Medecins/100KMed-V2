import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Blog — 100000médecins.org',
  description: 'Actualités, conseils et dossiers thématiques sur la e-santé et les logiciels médicaux.',
}

async function getArticles(categorieSlug?: string) {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('articles')
    .select('id, titre, slug, extrait, image_couverture, date_publication, articles_categories(id, nom, slug)')
    .eq('statut', 'publié')
    .order('date_publication', { ascending: false })

  if (categorieSlug) {
    const { data: cat } = await (supabase as any)
      .from('articles_categories')
      .select('id')
      .eq('slug', categorieSlug)
      .single()
    if (cat) query = query.eq('id_categorie', cat.id)
  }

  const { data } = await query
  return data ?? []
}

async function getCategories() {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles_categories')
    .select('id, nom, slug')
    .order('position', { ascending: true })
  return data ?? []
}

interface PageProps {
  searchParams: Promise<{ categorie?: string }>
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { categorie } = await searchParams
  const [articles, categories] = await Promise.all([
    getArticles(categorie),
    getCategories(),
  ])

  const [hero, ...rest] = articles

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero */}
        <section className="bg-hero-gradient py-14 md:py-20">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Blog</h1>
            <p className="text-white/75 text-lg max-w-xl mx-auto">
              Actualités, conseils et dossiers sur la e-santé médicale.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-12">
          {/* Filtres catégories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <Link
                href="/blog"
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  !categorie ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                }`}
              >
                Tous
              </Link>
              {categories.map((cat: { id: string; nom: string; slug: string }) => (
                <Link
                  key={cat.id}
                  href={`/blog?categorie=${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    categorie === cat.slug ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  }`}
                >
                  {cat.nom}
                </Link>
              ))}
            </div>
          )}

          {articles.length === 0 && (
            <p className="text-center text-gray-400 py-20">Aucun article publié pour l&apos;instant.</p>
          )}

          {/* Article hero (premier) */}
          {hero && (
            <Link href={`/blog/${hero.slug}`} className="group block mb-10">
              <div className="relative overflow-hidden rounded-3xl h-[340px] md:h-[420px] bg-surface-light">
                {hero.image_couverture ? (
                  <img
                    src={hero.image_couverture}
                    alt={hero.titre}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-hero-gradient" />
                )}
                {/* Dégradé incrusté */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(hero as any).articles_categories?.nom && (
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold mb-3">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(hero as any).articles_categories.nom}
                    </span>
                  )}
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-snug">{hero.titre}</h2>
                  {hero.extrait && (
                    <p className="text-white/80 text-sm leading-relaxed line-clamp-3">{hero.extrait}</p>
                  )}
                  {hero.date_publication && (
                    <p className="text-white/50 text-xs mt-3">
                      {new Date(hero.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Grille articles */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map((article: {
                id: string; titre: string; slug: string; extrait: string | null
                image_couverture: string | null; date_publication: string | null
                articles_categories?: { nom: string } | null
              }) => (
                <Link key={article.id} href={`/blog/${article.slug}`} className="group block">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 h-full flex flex-col">
                    {/* Image avec dégradé incrusté */}
                    <div className="relative overflow-hidden h-48 bg-surface-light shrink-0">
                      {article.image_couverture ? (
                        <img
                          src={article.image_couverture}
                          alt={article.titre}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-partners-gradient" />
                      )}
                      {/* Dégradé bas de l'image → fond blanc */}
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                      {article.extrait && (
                        <p className="absolute bottom-3 left-5 right-5 text-xs text-gray-600 leading-snug line-clamp-2 font-medium">
                          {article.extrait}
                        </p>
                      )}
                    </div>

                    {/* Texte */}
                    <div className="px-5 pt-2 pb-5 flex flex-col flex-1">
                      {article.articles_categories?.nom && (
                        <span className="text-xs font-semibold text-accent-blue uppercase tracking-wide mb-1.5">
                          {article.articles_categories.nom}
                        </span>
                      )}
                      <h3 className="font-bold text-navy text-base leading-snug group-hover:text-accent-blue transition-colors flex-1">
                        {article.titre}
                      </h3>
                      {article.date_publication && (
                        <p className="text-xs text-gray-400 mt-3">
                          {new Date(article.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
