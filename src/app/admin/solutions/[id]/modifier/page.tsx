export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getAllCategoriesAdmin } from '@/lib/db/categories'
import { getEditeurs } from '@/lib/db/editeurs'
import { getSolutionByIdAdmin, getResultatsRedacAdmin, getTagsForSolutionAdmin } from '@/lib/db/admin-solutions'
import SolutionWithSearch from '@/components/admin/SolutionWithSearch'
import SolutionLiensManager from '@/components/admin/SolutionLiensManager'
import SolutionCommunautesManager from '@/components/admin/SolutionCommunautesManager'
import RecalcSolutionButton from '@/components/admin/RecalcSolutionButton'
import { updateSolution, getVideosLieesASolution, getVideosForSolutionSelector } from '@/lib/actions/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditSolutionPage({ params }: PageProps) {
  const { id } = await params

  const solution = await getSolutionByIdAdmin(id).catch(() => null)
  if (!solution) notFound()

  const [categories, editeurs, notesRedac, tagsForSolution, videosLiees, allVideos] = await Promise.all([
    getAllCategoriesAdmin(),
    getEditeurs(),
    getResultatsRedacAdmin(id),
    getTagsForSolutionAdmin(id, solution.categorie_id),
    getVideosLieesASolution(id),
    getVideosForSolutionSelector(),
  ])

  const boundAction = updateSolution.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">
        Modifier : {solution.nom}
      </h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <SolutionWithSearch
          solution={solution}
          categories={categories}
          editeurs={editeurs}
          notesRedac={notesRedac}
          tagsForSolution={tagsForSolution}
          solutionId={id}
          videosLiees={videosLiees}
          allVideos={allVideos}
          action={boundAction}
        />
      </div>

      <div className="mt-6">
        <SolutionLiensManager solutionId={id} />
      </div>

      <div className="mt-6">
        <SolutionCommunautesManager solutionId={id} />
      </div>

      <div className="mt-4 flex justify-end">
        <RecalcSolutionButton solutionId={id} />
      </div>
    </div>
  )
}
