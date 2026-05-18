export const revalidate = 300

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getSolutionBySlug, getSolutions, getNotesRedac } from '@/lib/db/solutions'
import { getAllResultats } from '@/lib/db/resultats'
import { getAvisUtilisateursPaginated, computeAggregatedResultats, getAverageNoteUtilisateurs } from '@/lib/db/evaluations'
import { getSolutionsLiees } from '@/lib/db/solution-liens'
import { getCommunautesPubliques } from '@/lib/db/solution-communautes'
import SolutionDetailPage from '@/components/solutions/SolutionDetailPage'
import { generateSolutionJsonLd } from '@/lib/seo/jsonld'

interface PageProps {
  params: Promise<{ idCategorie: string; idSolution: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  try {
    const solution = await getSolutionBySlug(params.idSolution)
    const meta = solution.meta as Record<string, string | null> | null
    return {
      title: meta?.title || `${solution.nom} — Avis et évaluation`,
      description: meta?.description || solution.description || `Découvrez les avis de médecins sur ${solution.nom}.`,
      openGraph: {
        title: meta?.title || solution.nom,
        description: meta?.description || solution.description || undefined,
        images: solution.logo_url ? [{ url: solution.logo_url }] : undefined,
      },
    }
  } catch {
    return { title: 'Solution' }
  }
}

export default async function SolutionPage(props: PageProps) {
  const params = await props.params;
  const solution = await getSolutionBySlug(params.idSolution).catch(() => null)
  if (!solution) notFound()

  // Fetch résultats, notes rédac, avis paginés, note utilisateurs, solutions liées et communautés en parallèle (par UUID)
  let [resultats, notesRedac, avisPagines, noteUtilisateursData, solutionsLiees, communautes] = await Promise.all([
    getAllResultats(solution.id),
    getNotesRedac(solution.id),
    getAvisUtilisateursPaginated(solution.id, { page: 1, limit: 10, tri: 'date' }),
    getAverageNoteUtilisateurs(solution.id),
    getSolutionsLiees(solution.id),
    getCommunautesPubliques(solution.id),
  ])

  // Fallback : si la table resultats est vide, calculer depuis les évaluations
  if (resultats.length === 0) {
    resultats = await computeAggregatedResultats(solution.id)
  }

  // Fetch les autres solutions de la même catégorie pour la comparaison radar
  const categorieId = solution.categorie?.id
  let autreSolutions: { id: string; nom: string; logo_url: string | null }[] = []
  if (categorieId) {
    const allSolutions = await getSolutions({ categorieId })
    autreSolutions = allSolutions
      .filter((s) => s.id !== solution.id)
      .map((s) => ({ id: s.id, nom: s.nom, logo_url: s.logo_url }))
  }

  // JSON-LD pour le SEO
  const jsonLd = generateSolutionJsonLd(solution, resultats)

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <SolutionDetailPage
          solution={solution}
          resultats={resultats}
          notesRedac={notesRedac}
          avisPagines={avisPagines}
          autreSolutions={autreSolutions}
          noteUtilisateursData={noteUtilisateursData}
          solutionsLiees={solutionsLiees}
          communautes={communautes}
        />
      </main>
      <Footer />
    </>
  )
}
