export const dynamic = 'force-dynamic'

import { getAllCategoriesAdmin } from '@/lib/db/categories'
import { getEditeurs } from '@/lib/db/editeurs'
import SolutionForm from '@/components/admin/SolutionForm'
import { createSolution } from '@/lib/actions/admin'

export default async function AdminNewSolutionPage() {
  const [categories, editeurs] = await Promise.all([
    getAllCategoriesAdmin(),
    getEditeurs(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Ajouter une solution</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <SolutionForm
          categories={categories}
          editeurs={editeurs}
          action={createSolution}
        />
      </div>
    </div>
  )
}
