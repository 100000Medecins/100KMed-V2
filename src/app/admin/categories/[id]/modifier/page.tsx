export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategorieForm from '@/components/admin/CategorieForm'
import { updateCategorie } from '@/lib/actions/admin'

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

  const categorie = await getCategorieByIdAdmin(id).catch(() => null)
  if (!categorie) notFound()

  const boundAction = updateCategorie.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">
        Modifier : {categorie.nom}
      </h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <CategorieForm categorie={categorie} action={boundAction} />
      </div>
    </div>
  )
}
