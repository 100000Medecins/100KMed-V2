export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Instagram, Pencil, Plus } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteArticleButton from '@/components/admin/DeleteArticleButton'
import ArticleCategoriesManager from '@/components/admin/ArticleCategoriesManager'
import PropositionsArticlesPanel from '@/components/admin/PropositionsArticlesPanel'
import { getPropositionsEnAttente } from '@/lib/propositions-articles'

async function getArticlesAdmin() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('articles')
    .select('id, titre, slug, statut, date_publication, scheduled_at, id_categorie, articles_categories(nom)')
    .order('created_at', { ascending: false })
  return data ?? []
}

async function getArticlesCategories() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('articles_categories')
    .select('*')
    .order('position', { ascending: true })
  return data ?? []
}

async function getPropositions() {
  return getPropositionsEnAttente(createServiceRoleClient())
}

export default async function AdminBlogPage() {
  const [articles, categories, propositions] = await Promise.all([
    getArticlesAdmin(),
    getArticlesCategories(),
    getPropositions(),
  ])

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button href="/admin/blog/studio" variant="outline" size="md" leftIcon={<Instagram className="w-4 h-4" />}>
            Studio Instagram
          </Button>
          <Button href="/admin/blog/nouveau" variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
            Nouvel article
          </Button>
        </div>
      </div>

      {/* Propositions de sujets (lot hebdomadaire + regénération à la demande) */}
      <PropositionsArticlesPanel propositions={propositions} />

      {/* Liste articles */}
      <Card padding="none">
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
                          <Badge variant="success">Publié</Badge>
                        ) : isScheduled ? (
                          <Badge variant="warning">
                            Programmé · {new Date(article.scheduled_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {new Date(article.scheduled_at!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Brouillon</Badge>
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
      </Card>

      {/* Gestion catégories */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-4">Catégories</h2>
        <ArticleCategoriesManager initialCategories={categories} />
      </div>
    </div>
  )
}
