export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ArticleForm from '@/components/admin/ArticleForm'
import SocialPanel from '@/components/admin/SocialPanel'
import { updateArticle } from '@/lib/actions/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getArticle(id: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('articles').select('*').eq('id', id).single()
  return data
}

async function getCategories() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('articles_categories').select('id, nom').order('position', { ascending: true })
  return data ?? []
}

export default async function ModifierArticlePage({ params }: PageProps) {
  const { id } = await params
  const [article, categories] = await Promise.all([getArticle(id), getCategories()])
  if (!article) notFound()

  const boundAction = updateArticle.bind(null, id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Modifier : {article.titre}</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <ArticleForm article={article} categories={categories} action={boundAction} />
      </div>
      <SocialPanel article={{ id, titre: article.titre, extrait: article.extrait, slug: article.slug, image_couverture: article.image_couverture, statut: article.statut }} />
    </div>
  )
}
