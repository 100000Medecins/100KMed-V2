export const revalidate = 300

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getSolutionBySlug, getSolutionIdsBySlugs, getSolutions, getNotesRedac } from '@/lib/db/solutions'
import { getAllResultats } from '@/lib/db/resultats'
import { getAvisUtilisateursPaginated, computeAggregatedResultats, getAverageNoteUtilisateurs } from '@/lib/db/evaluations'
import { getSolutionsLiees } from '@/lib/db/solution-liens'
import { getCommunautesPubliques } from '@/lib/db/solution-communautes'
import { getNoteGlobaleTooltip } from '@/lib/db/tooltips'
import { getDisplayPrixFront, getDisplayContactsCommerciaux } from '@/lib/db/settings'
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

  // Ancien format Quasar : slug solution en CamelCase (ex. HelloDoc, AxiSante…),
  // hérité de firebaseId. Redirection 301 vers la version minuscule (convention Supabase).
  // Couvre aussi le slug catégorie si présent en CamelCase (rare, voir next.config.mjs
  // pour les renommages catégorie qui ne sont pas une simple normalisation de casse).
  if (
    params.idSolution !== params.idSolution.toLowerCase() ||
    params.idCategorie !== params.idCategorie.toLowerCase()
  ) {
    redirect(
      `/solutions/${params.idCategorie.toLowerCase()}/${params.idSolution.toLowerCase()}`
    )
  }

  // Ancienne URL de comparaison Quasar `/solutions/:cat/:slugA-vs-:slugB` → redirige 301 vers /solutions/comparer?ids=
  if (params.idSolution.includes('-vs-')) {
    const [slugA, slugB] = params.idSolution.split('-vs-')
    const idMap = await getSolutionIdsBySlugs([slugA, slugB])
    const ids = [idMap.get(slugA), idMap.get(slugB)].filter(Boolean)
    if (ids.length === 2) redirect(`/solutions/comparer?ids=${ids.join(',')}`)
    redirect('/solutions') // au moins un slug introuvable : fallback vers le listing
  }

  const solution = await getSolutionBySlug(params.idSolution).catch(() => null)
  if (!solution) notFound()

  // Fetch résultats, notes rédac, avis paginés, note utilisateurs, solutions liées, communautés, tooltip et toggles en parallèle
  let [resultats, notesRedac, avisPagines, noteUtilisateursData, solutionsLiees, communautes, noteGlobaleTooltip, displayPrixFront, displayContactsCommerciaux] = await Promise.all([
    getAllResultats(solution.id),
    getNotesRedac(solution.id),
    getAvisUtilisateursPaginated(solution.id, { page: 1, limit: 10, tri: 'date' }),
    getAverageNoteUtilisateurs(solution.id),
    getSolutionsLiees(solution.id),
    getCommunautesPubliques(solution.id),
    getNoteGlobaleTooltip(),
    getDisplayPrixFront(),
    getDisplayContactsCommerciaux(),
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
          noteGlobaleTooltip={noteGlobaleTooltip}
          displayPrixFront={displayPrixFront}
          displayContactsCommerciaux={displayContactsCommerciaux}
        />
      </main>
      <Footer />
    </>
  )
}
