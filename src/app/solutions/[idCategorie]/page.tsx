import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getCategorieBySlug } from '@/lib/db/categories'
import { getSolutions, getSolutionsByTags, getNotesGlobalesRedac } from '@/lib/db/solutions'
import { getTags } from '@/lib/db/misc'
import SolutionList from '@/components/solutions/SolutionList'
import SolutionFilters from '@/components/solutions/SolutionFilters'

export const revalidate = 1800 // ISR : 30 minutes

interface PageProps {
  params: { idCategorie: string }
  searchParams: { tags?: string; tri?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const categorie = await getCategorieBySlug(params.idCategorie)
    return {
      title: `${categorie.nom} — Comparatif logiciels médicaux`,
      description: categorie.intro || `Comparez les meilleurs logiciels de ${categorie.nom} grâce aux avis de médecins.`,
    }
  } catch {
    return { title: 'Solutions' }
  }
}

// Retourne vide : les pages seront générées on-demand via ISR
export async function generateStaticParams() {
  return []
}

export default async function SolutionsPage({ params, searchParams }: PageProps) {
  let categorie
  try {
    categorie = await getCategorieBySlug(params.idCategorie)
  } catch {
    notFound()
  }

  // Récupérer les tags de filtre depuis l'URL
  const selectedTagIds = searchParams.tags?.split(',').filter(Boolean) || []

  // Fetch solutions avec ou sans filtre tags (par UUID de la catégorie)
  const solutions = selectedTagIds.length > 0
    ? await getSolutionsByTags(categorie.id, selectedTagIds)
    : await getSolutions({ categorieId: categorie.id })

  // Fetch tous les tags de la catégorie pour les filtres
  const tags = await getTags(categorie.id)

  // Fetch les notes globales de la rédaction pour toutes les solutions
  const solutionIds = solutions.map((s) => s.id)
  const notesGlobales = await getNotesGlobalesRedac(solutionIds)

  // Enrichir les solutions avec la note de la rédaction
  const solutionsAvecNotes = solutions.map((s) => ({
    ...s,
    noteRedacBase5: notesGlobales[s.id] || null,
  }))

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero catégorie */}
        <section className="bg-surface-light py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-4">
              {categorie.icon && (
                <span className="text-3xl">Catégorie :</span>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-navy">
                {categorie.nom}
              </h1>
            </div>
            {categorie.intro && (
              <p className="text-gray-600 max-w-2xl">{categorie.intro}</p>
            )}
            <p className="text-sm text-gray-400 mt-2">
              {solutions.length} solution{solutions.length > 1 ? 's' : ''} disponible{solutions.length > 1 ? 's' : ''}
            </p>
          </div>
        </section>

        {/* Filtres + liste */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <Suspense fallback={<div className="h-12 bg-surface-light rounded-xl animate-pulse" />}>
            <SolutionFilters
              tags={tags}
              selectedTagIds={selectedTagIds}
              categorieId={categorie.id}
            />
          </Suspense>

          <div className="mt-8">
            <SolutionList solutions={solutionsAvecNotes} categorieSlug={categorie.slug || ''} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
