import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import BlogView from '@/components/blog/BlogView'
import BlogBrowser from '@/components/blog/BlogBrowser'

// ISR 30 min (page ○). Aucune lecture de cookies/searchParams côté serveur → statique.
// Le filtre par catégorie est fait côté client (BlogBrowser + useSearchParams).
export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Blog — 100000médecins.org',
  description: 'Actualités, conseils et dossiers thématiques sur la e-santé et les logiciels médicaux.',
}

async function getArticles() {
  const supabase = createPublicClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles')
    .select('id, titre, slug, extrait, image_couverture, date_publication, articles_categories(nom, slug)')
    .eq('statut', 'publié')
    .order('date_publication', { ascending: false })
  return data ?? []
}

async function getCategories() {
  const supabase = createPublicClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles_categories')
    .select('id, nom, slug')
    .order('position', { ascending: true })
  return data ?? []
}

export default async function BlogPage() {
  const [articles, categories] = await Promise.all([getArticles(), getCategories()])

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero */}
        <section className="bg-hero-gradient pb-10 md:pb-16">
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 min-[1150px]:pl-[200px]">
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Blog' }]} variant="light" />
          </div>
          <div className="max-w-5xl mx-auto px-6 text-center mt-10 md:mt-14">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Blog</h1>
            <p className="text-white/75 text-lg max-w-xl mx-auto">
              Actualités, conseils et dossiers sur la e-santé médicale.
            </p>
          </div>
        </section>

        {/* Liste + filtre. Le filtre lit `useSearchParams` (client) → sous <Suspense> pour
            garder la page statique. Fallback = vue « Tous » rendue serveur (SEO : tous les
            articles dans le HTML), remplacée au montage par la vue pilotée par l'URL. */}
        <Suspense fallback={<BlogView articles={articles} categories={categories} activeCategorie={null} />}>
          <BlogBrowser articles={articles} categories={categories} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
