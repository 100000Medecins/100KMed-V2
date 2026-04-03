export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategorieForm from '@/components/admin/CategorieForm'
import TagsCategorieSection from '@/components/admin/TagsCategorieSection'
import { updateCategorie } from '@/lib/actions/admin'
import { getTagsForCategorieAdmin } from '@/lib/db/admin-solutions'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCategorieByIdAdmin(id: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export default async function AdminEditCategoriePage({ params }: PageProps) {
  const { id } = await params

  const [categorie, tags] = await Promise.all([
    getCategorieByIdAdmin(id).catch(() => null),
    getTagsForCategorieAdmin(id),
  ])

  if (!categorie) notFound()

  const boundAction = updateCategorie.bind(null, id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-8">
          Modifier : {categorie.nom}
        </h1>
        <div className="bg-white rounded-card shadow-card p-6 md:p-8">
          <CategorieForm categorie={categorie} action={boundAction} />
        </div>
      </div>

      {/* Gestion des fonctionnalités de la catégorie */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-4">
          Fonctionnalités ({tags.length})
        </h2>
        <div className="bg-white rounded-card shadow-card p-6 md:p-8">
          <p className="text-sm text-gray-500 mb-5">
            Définissez ici les fonctionnalités disponibles pour cette catégorie. Elles apparaîtront dans la barre de filtres du comparatif et pourront être associées aux solutions individuellement.
          </p>
          <TagsCategorieSection categorieId={id} initialTags={tags} />
        </div>
      </div>
    </div>
  )
}
