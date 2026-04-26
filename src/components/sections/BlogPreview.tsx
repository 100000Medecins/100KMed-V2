import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

type Article = {
  id: string
  titre: string
  slug: string
  extrait: string | null
  image_couverture: string | null
  date_publication: string | null
  articles_categories?: { nom: string } | null
}

async function getDerniersArticles(): Promise<Article[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles')
    .select('id, titre, slug, extrait, image_couverture, date_publication, articles_categories(nom)')
    .eq('statut', 'publié')
    .order('date_publication', { ascending: false })
    .limit(3)
  return data ?? []
}

export default async function BlogPreview() {
  const articles = await getDerniersArticles()
  if (articles.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-surface-light bg-dots">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-2">Blog</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-navy leading-snug">
              Ce qu&apos;on décrypte pour vous
            </h2>
          </div>
          <Link
            href="/blog"
            className="shrink-0 text-sm font-semibold text-accent-blue hover:underline hidden sm:block"
          >
            Voir tous les articles →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/blog/${article.slug}`} className="group block">
              <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 h-full flex flex-col">
                <div className="relative overflow-hidden h-44 bg-surface-light shrink-0">
                  {article.image_couverture ? (
                    <img
                      src={article.image_couverture}
                      alt={article.titre}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-hero-gradient" />
                  )}
                </div>

                <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
                  {article.articles_categories?.nom && (
                    <span className="text-xs font-semibold text-accent-blue uppercase tracking-wide mb-1.5">
                      {article.articles_categories.nom}
                    </span>
                  )}
                  <h3 className="font-bold text-navy text-base leading-snug group-hover:text-accent-blue transition-colors mb-2">
                    {article.titre}
                  </h3>
                  {article.extrait && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
                      {article.extrait}
                    </p>
                  )}
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

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-button text-sm font-semibold bg-navy text-white hover:bg-navy/90 transition-colors"
          >
            Voir tous les articles
          </Link>
        </div>
      </div>
    </section>
  )
}
