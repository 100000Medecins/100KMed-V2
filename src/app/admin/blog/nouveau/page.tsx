export const dynamic = 'force-dynamic'

import { createServiceRoleClientUntyped } from '@/lib/supabase/server'
import ArticleForm from '@/components/admin/ArticleForm'
import { createArticle } from '@/lib/actions/admin'

async function getCategories() {
  const supabase = createServiceRoleClientUntyped()
  const { data } = await supabase.from('articles_categories').select('id, nom').order('position', { ascending: true })
  return data ?? []
}

export default async function NouvelArticlePage() {
  const categories = await getCategories()
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvel article</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <ArticleForm categories={categories} action={createArticle} />
      </div>
    </div>
  )
}
