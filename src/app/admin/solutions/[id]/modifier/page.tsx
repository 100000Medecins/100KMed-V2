export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getAllCategoriesAdmin } from '@/lib/db/categories'
import { getEditeurs } from '@/lib/db/editeurs'
import { getSolutionByIdAdmin, getResultatsRedacAdmin, getTagsForSolutionAdmin } from '@/lib/db/admin-solutions'
import SolutionForm from '@/components/admin/SolutionForm'
import { updateSolution } from '@/lib/actions/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditSolutionPage({ params }: PageProps) {
  const { id } = await params

  const solution = await getSolutionByIdAdmin(id).catch(() => null)
  if (!solution) notFound()

  const [categories, editeurs, notesRedac, tagsForSolution] = await Promise.all([
    getAllCategoriesAdmin(),
    getEditeurs(),
    getResultatsRedacAdmin(id),
    getTagsForSolutionAdmin(id, solution.categorie_id),
  ])

  const boundAction = updateSolution.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">
        Modifier : {solution.nom}
      </h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <SolutionForm
          solution={solution}
          categories={categories}
          editeurs={editeurs}
          notesRedac={notesRedac}
          tagsForSolution={tagsForSolution}
          solutionId={id}
          action={boundAction}
        />
      </div>
    </div>
  )
}
