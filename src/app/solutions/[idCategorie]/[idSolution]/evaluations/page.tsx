import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getSolutionBySlug } from '@/lib/db/solutions'
import { getCategorieBySlug } from '@/lib/db/categories'
import { getAvisUtilisateurs } from '@/lib/db/evaluations'
import AvisUtilisateurs from '@/components/evaluation/AvisUtilisateurs'

interface PageProps {
  params: { idCategorie: string; idSolution: string }
  searchParams: { tri?: string; page?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const solution = await getSolutionBySlug(params.idSolution)
    return {
      title: `Avis utilisateurs — ${solution.nom}`,
      description: `Consultez tous les avis de médecins sur ${solution.nom}.`,
    }
  } catch {
    return { title: 'Avis utilisateurs' }
  }
}

export default async function EvaluationsPage({ params, searchParams }: PageProps) {
  let solution
  let categorie
  try {
    solution = await getSolutionBySlug(params.idSolution)
    categorie = await getCategorieBySlug(params.idCategorie)
  } catch {
    notFound()
  }

  const critereTri = searchParams.tri || 'date'
  const limit = 10

  const avisResult = await getAvisUtilisateurs(
    solution.id,
    categorie.id,
    { critereTri, limit }
  )

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold text-navy mb-2">
            Avis utilisateurs — {solution.nom}
          </h1>
          <p className="text-gray-500 mb-8">
            {avisResult.avis.length} avis de médecins
          </p>

          <AvisUtilisateurs
            avis={avisResult.avis}
            solutionId={solution.id}
            categorieId={categorie.id}
            critereTri={critereTri}
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
