export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getCategorieBySlug } from '@/lib/db/categories'
import { getSolutions, getSolutionsByTags, getNotesGlobalesRedac, getNotesUtilisateursGlobales, getNotesCritere } from '@/lib/db/solutions'
import { getTags, getCriteresMajeurs } from '@/lib/db/misc'
import SolutionList from '@/components/solutions/SolutionList'
import SolutionFilters from '@/components/solutions/SolutionFilters'
import SolutionSortBar from '@/components/solutions/SolutionSortBar'

interface PageProps {
  params: { idCategorie: string }
  searchParams: { tags?: string; tri?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) return { title: 'Solutions' }
  return {
    title: `${categorie.nom} — Comparatif logiciels médicaux`,
    description: categorie.intro || `Comparez les meilleurs logiciels de ${categorie.nom} grâce aux avis de médecins.`,
  }
}

export async function generateStaticParams() {
  return []
}

export default async function SolutionsPage({ params, searchParams }: PageProps) {
  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) notFound()

  const selectedTagIds = searchParams.tags?.split(',').filter(Boolean) || []
  const tri = searchParams.tri || 'nom'

  // Fetch solutions
  const solutions = selectedTagIds.length > 0
    ? await getSolutionsByTags(categorie.id, selectedTagIds)
    : await getSolutions({ categorieId: categorie.id })

  const solutionIds = solutions.map((s) => s.id)

  // Fetch tags, critères majeurs, notes rédac
  const [tags, criteresMajeurs, notesRedac] = await Promise.all([
    getTags(categorie.id),
    getCriteresMajeurs(categorie.id),
    getNotesGlobalesRedac(solutionIds),
  ])

  // Fetch notes utilisateurs si tri par utilisateurs ou par critère
  const needsUserNotes = tri === 'note_utilisateurs'
  const critereIdTri = tri.startsWith('critere_') ? tri.replace('critere_', '') : null

  const [notesUtilisateurs, notesCritere] = await Promise.all([
    needsUserNotes ? getNotesUtilisateursGlobales(solutionIds) : Promise.resolve({} as Record<string, number>),
    critereIdTri ? getNotesCritere(solutionIds, critereIdTri) : Promise.resolve({} as Record<string, number>),
  ])

  // Enrichir et trier
  let solutionsAvecNotes = solutions.map((s) => ({
    ...s,
    noteRedacBase5: notesRedac[s.id] ?? null,
    noteUtilisateursBase5: notesUtilisateurs[s.id] ?? null,
    noteCritere: notesCritere[s.id] ?? null,
  }))

  if (tri === 'note_redac') {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) => (b.noteRedacBase5 ?? -1) - (a.noteRedacBase5 ?? -1))
  } else if (tri === 'note_utilisateurs') {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) => (b.noteUtilisateursBase5 ?? -1) - (a.noteUtilisateursBase5 ?? -1))
  } else if (critereIdTri) {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) => (b.noteCritere ?? -1) - (a.noteCritere ?? -1))
  }
  // default: ordre alphabétique déjà appliqué par getSolutions

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero catégorie */}
        <section className="bg-surface-light py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-navy mb-4 flex items-center gap-3">
                  {categorie.icon && <span className="text-3xl">{categorie.icon}</span>}
                  {categorie.nom}
                </h1>
                {categorie.intro && (
                  <div className="text-gray-600 prose prose-sm" dangerouslySetInnerHTML={{ __html: categorie.intro }} />
                )}
                <p className="text-sm text-gray-400 mt-4">
                  {solutions.length} solution{solutions.length > 1 ? 's' : ''} disponible{solutions.length > 1 ? 's' : ''}
                </p>
              </div>
              {categorie.image_url && (
                <div className="shrink-0 w-full md:w-80">
                  <img
                    src={categorie.image_url}
                    alt={categorie.nom}
                    className="w-full h-48 md:h-56 object-cover rounded-2xl shadow-card"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filtres + liste */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar filtres (tags uniquement) */}
            {tags.length > 0 && (
              <aside className="w-full md:w-52 shrink-0">
                <Suspense fallback={<div className="h-12 bg-surface-light rounded-xl animate-pulse" />}>
                  <SolutionFilters
                    tags={tags}
                    selectedTagIds={selectedTagIds}
                    currentTri={tri}
                  />
                </Suspense>
              </aside>
            )}

            {/* Grille solutions */}
            <div className="flex-1 min-w-0">
              <SolutionSortBar
                criteresMajeurs={criteresMajeurs}
                currentTri={tri}
                selectedTagIds={selectedTagIds}
                count={solutionsAvecNotes.length}
              />
              <SolutionList solutions={solutionsAvecNotes} categorieSlug={categorie.slug || ''} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
