import Link from 'next/link'

export type BlogArticle = {
  id: string
  titre: string
  slug: string
  extrait: string | null
  image_couverture: string | null
  date_publication: string | null
  articles_categories?: { nom: string; slug: string } | null
}
export type BlogCategorie = { id: string; nom: string; slug: string }

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null
}

/**
 * Vue liste du blog — composant PUR (rendu identique côté serveur et client).
 * Utilisé à la fois comme fallback <Suspense> (rendu serveur, SEO) et dans
 * BlogBrowser (client, piloté par `?categorie=`). Le filtrage se fait ici, en mémoire.
 */
export default function BlogView({
  articles,
  categories,
  activeCategorie,
}: {
  articles: BlogArticle[]
  categories: BlogCategorie[]
  activeCategorie: string | null
}) {
  const filtered = activeCategorie
    ? articles.filter((a) => a.articles_categories?.slug === activeCategorie)
    : articles
  const [hero, ...rest] = filtered

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      {/* Filtres catégories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              !activeCategorie ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
            }`}
          >
            Tous
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?categorie=${cat.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeCategorie === cat.slug ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
              }`}
            >
              {cat.nom}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-20">Aucun article publié pour l&apos;instant.</p>
      )}

      {/* Article hero (premier) */}
      {hero && (
        <Link href={`/blog/${hero.slug}`} className="group block mb-10">
          <div className="relative overflow-hidden rounded-3xl h-[340px] md:h-[420px] bg-surface-light">
            {hero.image_couverture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.image_couverture}
                alt={hero.titre}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-hero-gradient" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              {hero.articles_categories?.nom && (
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold mb-3">
                  {hero.articles_categories.nom}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-snug">{hero.titre}</h2>
              {hero.extrait && <p className="text-white/80 text-sm leading-relaxed line-clamp-3">{hero.extrait}</p>}
              {hero.date_publication && <p className="text-white/50 text-xs mt-3">{fmtDate(hero.date_publication)}</p>}
            </div>
          </div>
        </Link>
      )}

      {/* Grille articles */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rest.map((article) => (
            <Link key={article.id} href={`/blog/${article.slug}`} className="group block">
              <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 h-full flex flex-col">
                <div className="relative overflow-hidden h-48 bg-surface-light shrink-0">
                  {article.image_couverture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.image_couverture}
                      alt={article.titre}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-partners-gradient" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                  {article.extrait && (
                    <p className="absolute bottom-3 left-5 right-5 text-xs text-gray-600 leading-snug line-clamp-2 font-medium">
                      {article.extrait}
                    </p>
                  )}
                </div>
                <div className="px-5 pt-2 pb-5 flex flex-col flex-1">
                  {article.articles_categories?.nom && (
                    <span className="text-xs font-semibold text-accent-blue uppercase tracking-wide mb-1.5">
                      {article.articles_categories.nom}
                    </span>
                  )}
                  <h3 className="font-bold text-navy text-base leading-snug group-hover:text-accent-blue transition-colors flex-1">
                    {article.titre}
                  </h3>
                  {article.date_publication && <p className="text-xs text-gray-400 mt-3">{fmtDate(article.date_publication)}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
