export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteArticleButton from '@/components/admin/DeleteArticleButton'
import ArticleCategoriesManager from '@/components/admin/ArticleCategoriesManager'

async function getArticlesAdmin() {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('articles')
    .select('id, titre, slug, statut, date_publication, scheduled_at, id_categorie, articles_categories(nom)')
    .order('created_at', { ascending: false })
  return (data ?? []) as Array<{
    id: string
    titre: string
    slug: string
    statut: string
    date_publication: string | null
    scheduled_at: string | null
    id_categorie: string | null
    articles_categories: { nom: string } | null
  }>
}

async function getArticlesCategories() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('articles_categories')
    .select('*')
    .order('position', { ascending: true })
  return data ?? []
}

export default async function AdminBlogPage() {
  const [articles, categories] = await Promise.all([
    getArticlesAdmin(),
    getArticlesCategories(),
  ])

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/blog/nouveau"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-button hover:bg-navy-dark transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </Link>
      </div>

      {/* Liste articles */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {articles.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            Aucun article pour l&apos;instant.{' '}
            <Link href="/admin/blog/nouveau" className="text-accent-blue hover:underline">
              Créer le premier
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Statut</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {articles.map((article) => {
                  const cat = article.articles_categories
                  const isScheduled = article.statut === 'brouillon' && !!article.scheduled_at
                  return (
                    <tr key={article.id} className="hover:bg-surface-light transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-navy text-sm">{article.titre}</span>
                        <span className="block text-xs text-gray-400 font-mono mt-0.5">/blog/{article.slug}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                        {cat?.nom ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {article.statut === 'publié' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Publié
                          </span>
                        ) : isScheduled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Programmé · {new Date(article.scheduled_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {new Date(article.scheduled_at!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Brouillon
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell">
                        {article.date_publication
                          ? new Date(article.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/blog/${article.id}/modifier`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Éditer
                          </Link>
                          <DeleteArticleButton id={article.id} titre={article.titre} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestion catégories */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-4">Catégories</h2>
        <ArticleCategoriesManager initialCategories={categories} />
      </div>
    </div>
  )
}
