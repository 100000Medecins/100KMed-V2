export const revalidate = 300

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getArticle(slug: string) {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles')
    .select('*, articles_categories(id, nom, slug)')
    .eq('slug', slug)
    .eq('statut', 'publié')
    .single()
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article introuvable' }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://100000medecins.org'
  return {
    title: `${article.titre} — 100000médecins.org`,
    description: article.meta_description || article.extrait || undefined,
    openGraph: {
      title: article.titre,
      description: article.meta_description || article.extrait || undefined,
      url: `${siteUrl}/blog/${slug}`,
      siteName: '100 000 Médecins',
      type: 'article',
      ...(article.image_couverture ? {
        images: [{
          url: article.image_couverture,
          width: 1200,
          height: 630,
          alt: article.titre,
        }],
      } : {}),
    },
    twitter: {
      card: article.image_couverture ? 'summary_large_image' : 'summary',
      title: article.titre,
      description: article.meta_description || article.extrait || undefined,
      images: article.image_couverture ? [article.image_couverture] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  const cat = article.articles_categories

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero article */}
        <div className="relative overflow-hidden h-[300px] md:h-[420px] bg-surface-light">
          {article.image_couverture ? (
            <img
              src={article.image_couverture}
              alt={article.titre}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-hero-gradient" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
          <div className="absolute top-0 left-0 right-0 max-w-3xl mx-auto px-6 pt-4">
            <Breadcrumb items={[
              { label: 'Accueil', href: '/' },
              { label: 'Blog', href: '/blog' },
              ...(cat?.nom ? [{ label: cat.nom, href: `/blog?categorie=${cat.slug}` }] : []),
              { label: article.titre },
            ]} variant="light" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 pb-10">
            {cat?.nom && (
              <Link
                href={`/blog?categorie=${cat.slug}`}
                className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold mb-4 hover:bg-white/30 transition-colors"
              >
                {cat.nom}
              </Link>
            )}
            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-snug">{article.titre}</h1>
            {article.date_publication && (
              <p className="text-white/50 text-sm mt-3">
                {new Date(article.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Extrait en chapeau */}
          {article.extrait && (
            <p className="text-lg text-gray-600 leading-relaxed font-medium mb-8 pb-8 border-b border-gray-100">
              {article.extrait}
            </p>
          )}

          {/* Corps de l'article */}
          {article.contenu && (
            <div
              className="prose-custom"
              dangerouslySetInnerHTML={{ __html: article.contenu }}
            />
          )}

          {/* Retour blog */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <Link
              href={cat ? `/blog?categorie=${cat.slug}` : '/blog'}
              className="inline-flex items-center gap-2 text-sm text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
            >
              ← Retour au blog{cat ? ` — ${cat.nom}` : ''}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
