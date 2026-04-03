import { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://10000medecins.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerClient()

  // Fetch toutes les données nécessaires en parallèle
  const [categoriesRes, solutionsRes, editeursRes] = await Promise.all([
    supabase.from('categories').select('slug').eq('actif', true),
    supabase.from('solutions').select('slug, categorie:categories(slug)'),
    supabase.from('editeurs').select('id'),
  ])

  const categories = categoriesRes.data || []
  const solutions = solutionsRes.data || []
  const editeurs = editeursRes.data || []

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/qui-sommes-nous`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/cgu`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/rgpd`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/actualites`,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/videos`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  // Pages catégories
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/solutions/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Pages solutions (les plus importantes pour le SEO)
  const solutionPages: MetadataRoute.Sitemap = solutions.map((sol) => ({
    url: `${BASE_URL}/solutions/${(sol.categorie as unknown as { slug: string } | null)?.slug ?? 'unknown'}/${sol.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Pages éditeurs
  const editeurPages: MetadataRoute.Sitemap = editeurs.map((ed) => ({
    url: `${BASE_URL}/editeur/${ed.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...categoryPages, ...solutionPages, ...editeurPages]
}
