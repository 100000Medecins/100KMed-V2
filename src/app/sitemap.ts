import { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

// Sitemap mis en cache (ISR), régénéré au plus une fois par heure. Évite d'interroger
// Supabase à chaque hit de Googlebot : un hoquet BDD ferait 5xx la route, que Google
// journalise comme « Impossible de récupérer le sitemap ». Cf docs/redirections-404-seo.md.
export const revalidate = 3600

// Bloquer le sitemap hors prod (cf robots.ts) : evite que Google decouvre
// les URLs via le sitemap d'un environnement preview/dev.
const IS_PROD = process.env.VERCEL_ENV === 'production'

// Routes statiques réellement servies par l'app (vérifiées dans src/app/).
// Les pages de contenu (cgu, rgpd…) sont servies par le groupe (static) qui lit pages_statiques.
const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}> = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/solutions', changeFrequency: 'daily', priority: 0.9 },
  { path: '/editeurs', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/comparatifs', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/actualites', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/stories-tutos', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/videos', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/glossaire', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/qui-sommes-nous', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/irritants-esante', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/difficile-de-changer', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/tous-ensemble', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/lancement-100k', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/transparence', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cgu', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/rgpd', changeFrequency: 'yearly', priority: 0.2 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Hors prod : sitemap vide (en complement du robots.txt qui Disallow: /)
  if (!IS_PROD) return []

  const now = new Date()

  // ─── Pages statiques (aucune dépendance BDD — toujours servies) ───
  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  try {
  const supabase = createServiceRoleClient()

  const [categoriesRes, solutionsRes, articlesRes, editeursRes] = await Promise.all([
    // Catégories actives uniquement
    supabase.from('categories').select('slug').eq('actif', true),
    // Solutions actives dont la catégorie est active (INNER JOIN sur categorie.actif)
    supabase
      .from('solutions')
      .select('slug, updated_at, categorie:categories!inner(slug, actif)')
      .eq('actif', true)
      .eq('categorie.actif', true),
    // Articles de blog publiés (statut en base = 'publié', avec accent)
    supabase.from('articles').select('slug, updated_at, date_publication').eq('statut', 'publié'),
    // Éditeurs marqués "affiche_sur_index" ET ayant au moins une solution active
    // dans une catégorie active (INNER JOIN imbriqué — dédoublonné côté code).
    // Cohérent avec /editeurs : un éditeur masqué de l'annuaire ne doit pas être indexé.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('editeurs')
      .select('slug, updated_at, solutions:solutions!inner(actif, categorie:categories!inner(actif))')
      .eq('affiche_sur_index', true)
      .eq('solutions.actif', true)
      .eq('solutions.categorie.actif', true),
  ])

  const categories = categoriesRes.data || []
  const solutions = solutionsRes.data || []
  const articles = articlesRes.data || []
  const editeurs = editeursRes.data || []

  // Dédoublonnage des éditeurs (l'INNER JOIN peut renvoyer plusieurs lignes par éditeur)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editeursUniques = Array.from(
    new Map((editeurs as any[]).map((e) => [e.slug as string, e])).values()
  )

  // ─── Pages catégories ───
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/solutions/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // ─── Pages solutions (les plus importantes pour le SEO) ───
  const solutionPages: MetadataRoute.Sitemap = solutions
    .map((sol) => {
      const catSlug = (sol.categorie as unknown as { slug: string } | null)?.slug
      if (!catSlug || !sol.slug) return null
      return {
        url: `${BASE_URL}/solutions/${catSlug}/${sol.slug}`,
        lastModified: sol.updated_at ? new Date(sol.updated_at as string) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // ─── Articles de blog publiés ───
  const articlePages: MetadataRoute.Sitemap = articles
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${BASE_URL}/blog/${a.slug}`,
      lastModified: a.updated_at
        ? new Date(a.updated_at as string)
        : a.date_publication
          ? new Date(a.date_publication as string)
          : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  // ─── Pages éditeurs (avec slug, ayant au moins une solution active) ───
  const editeurPages: MetadataRoute.Sitemap = editeursUniques.map((ed) => ({
    url: `${BASE_URL}/editeur/${ed.slug}`,
    lastModified: ed.updated_at ? new Date(ed.updated_at as string) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

    return [...staticPages, ...categoryPages, ...solutionPages, ...articlePages, ...editeurPages]
  } catch (err) {
    // Hoquet Supabase (cold start, réseau…) : ne JAMAIS 5xx — Googlebot le journaliserait
    // comme « Impossible de récupérer le sitemap ». On sert au moins les pages statiques.
    console.error('[sitemap] échec fetch BDD, repli sur les pages statiques :', err)
    return staticPages
  }
}
