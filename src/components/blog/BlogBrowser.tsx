'use client'

import { useSearchParams } from 'next/navigation'
import BlogView, { type BlogArticle, type BlogCategorie } from './BlogView'

/**
 * Pilote la liste du blog depuis `?categorie=` (client) → garde la page statique.
 * Doit être rendu sous <Suspense> (useSearchParams). Le fallback est un BlogView
 * serveur (vue « Tous ») : la liste complète est dans le HTML statique (SEO).
 */
export default function BlogBrowser({
  articles,
  categories,
}: {
  articles: BlogArticle[]
  categories: BlogCategorie[]
}) {
  const activeCategorie = useSearchParams().get('categorie')
  return <BlogView articles={articles} categories={categories} activeCategorie={activeCategorie} />
}
