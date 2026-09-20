export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import ArticleForm from '@/components/admin/ArticleForm'
import { createArticle } from '@/lib/actions/admin'
import type { LongueurArticle } from '@/lib/ai/article'
import type { SourceActu } from '@/lib/propositions-articles'

async function getCategories() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('articles_categories').select('id, nom').order('position', { ascending: true })
  return data ?? []
}

/**
 * Chemin « Ouvrir le formulaire » d'une proposition de sujet : on pré-remplit le
 * brief et la longueur, sans rien écrire en base. La proposition n'est marquée
 * développée qu'à la création effective de l'article (`createArticle`), via le
 * champ caché `proposition_id` — sinon un simple coup d'œil la ferait disparaître.
 */
async function getProposition(id: string | undefined) {
  if (!id) return null
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('propositions_articles')
    .select('id, titre, angle, longueur, sources, statut')
    .eq('id', id)
    .maybeSingle()

  if (!data || data.statut !== 'proposee') return null

  const sources = (data.sources ?? []) as unknown as SourceActu[]
  const bloc = sources.length
    ? `\n\nÉléments d'actualité à prendre en compte :\n${sources.map((s) => `- ${s.titre} (${s.url})`).join('\n')}`
    : ''

  return {
    id: data.id,
    brief: `${data.titre}\n\n${data.angle}${bloc}`,
    longueur: data.longueur as LongueurArticle,
  }
}

export default async function NouvelArticlePage(props: {
  searchParams: Promise<{ proposition?: string }>
}) {
  const searchParams = await props.searchParams
  const [categories, proposition] = await Promise.all([
    getCategories(),
    getProposition(searchParams.proposition),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvel article</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <ArticleForm
          categories={categories}
          action={createArticle}
          initialBrief={proposition?.brief}
          initialLongueur={proposition?.longueur}
          propositionId={proposition?.id}
        />
      </div>
    </div>
  )
}
