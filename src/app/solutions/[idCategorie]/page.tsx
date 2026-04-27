export const revalidate = 300

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { getCategorieBySlug } from '@/lib/db/categories'
import { getSolutions, getSolutionsByTags, getNotesGlobalesRedac, getNotesUtilisateursGlobales, getNotesCritere, getNbNotesUtilisateurs } from '@/lib/db/solutions'
import { getTags, getCriteresMajeurs } from '@/lib/db/misc'
import SolutionList from '@/components/solutions/SolutionList'
import SolutionFilters from '@/components/solutions/SolutionFilters'
import SolutionSortBar from '@/components/solutions/SolutionSortBar'

interface PageProps {
  params: { idCategorie: string }
  searchParams: { tags?: string; tri?: string; critere?: string; dir?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) return { title: 'Solutions' }
  return {
    title: `${categorie.nom} — Comparatif logiciels médicaux`,
    description: categorie.intro || `Comparez les meilleurs logiciels de ${categorie.nom} grâce aux avis de médecins.`,
  }
}

// Le flag has_note_redac sur la catégorie contrôle l'affichage du tri par note rédaction

const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
  nom: 'asc',
  note_redac: 'desc',
  note_utilisateurs: 'desc',
}

export default async function SolutionsPage({ params, searchParams }: PageProps) {
  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) notFound()

  const selectedTagIds = searchParams.tags?.split(',').filter(Boolean) || []
  const tri = searchParams.tri || 'note_utilisateurs'
  const critereId = searchParams.critere || ''
  const dir: 'asc' | 'desc' = (searchParams.dir === 'asc' || searchParams.dir === 'desc')
    ? searchParams.dir
    : DEFAULT_DIR[tri] ?? 'desc'

  // Fetch solutions
  const solutions = selectedTagIds.length > 0
    ? await getSolutionsByTags(categorie.id, selectedTagIds)
    : await getSolutions({ categorieId: categorie.id })

  const solutionIds = solutions.map((s) => s.id)

  // Fetch en parallèle
  const [tags, criteresMajeurs, notesRedac, nbNotesMap] = await Promise.all([
    getTags(categorie.id),
    getCriteresMajeurs(categorie.id),
    getNotesGlobalesRedac(solutionIds),
    getNbNotesUtilisateurs(solutionIds),
  ])

  // Notes selon le tri demandé
  const needsUserNotes = tri === 'note_utilisateurs'
  const needsCritere = (tri === 'note_redac' || tri === 'note_utilisateurs') && critereId

  const [notesUtilisateurs, notesCritere] = await Promise.all([
    needsUserNotes ? getNotesUtilisateursGlobales(solutionIds) : Promise.resolve({} as Record<string, number>),
    needsCritere ? getNotesCritere(solutionIds, critereId, tri === 'note_utilisateurs' ? 'utilisateurs' : 'redac') : Promise.resolve({} as Record<string, number>),
  ])

  // Enrichir
  let solutionsAvecNotes = solutions.map((s) => ({
    ...s,
    noteRedacBase5: notesRedac[s.id] ?? null,
    noteUtilisateursBase5: notesUtilisateurs[s.id] ?? null,
    noteCritere: notesCritere[s.id] ?? null,
    nbNotesUtilisateurs: nbNotesMap[s.id] ?? null,
  }))

  // Trier (direction appliquée)
  const asc = dir === 'asc'
  if (needsCritere) {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) =>
      asc ? (a.noteCritere ?? -1) - (b.noteCritere ?? -1) : (b.noteCritere ?? -1) - (a.noteCritere ?? -1)
    )
  } else if (tri === 'note_redac') {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) =>
      asc ? (a.noteRedacBase5 ?? -1) - (b.noteRedacBase5 ?? -1) : (b.noteRedacBase5 ?? -1) - (a.noteRedacBase5 ?? -1)
    )
  } else if (tri === 'note_utilisateurs') {
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) =>
      asc ? (a.noteUtilisateursBase5 ?? -1) - (b.noteUtilisateursBase5 ?? -1) : (b.noteUtilisateursBase5 ?? -1) - (a.noteUtilisateursBase5 ?? -1)
    )
  } else {
    // tri nom
    solutionsAvecNotes = solutionsAvecNotes.sort((a, b) =>
      asc ? (a.nom || '').localeCompare(b.nom || '') : (b.nom || '').localeCompare(a.nom || '')
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero catégorie */}
        <section className="bg-hero-gradient pt-3 pb-4 md:pb-14">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-3 md:mb-12">
              <Breadcrumb variant="light" items={[{ label: 'Accueil', href: '/' }, { label: 'Comparatifs', href: '/comparatifs' }, { label: categorie.nom }]} />
            </div>
            <div className="flex items-center gap-2 md:gap-10">
              <div className="flex-1">
                {/* Titre */}
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-6 flex items-center gap-3">
                  {categorie.icon && <span className="text-2xl md:text-3xl">{categorie.icon}</span>}
                  {categorie.nom}
                </h1>

                {/* Intro : masquée sur mobile */}
                {categorie.intro && (
                  <div
                    className="hidden md:block text-white/70 text-sm leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_em]:text-white/60 [&_strong]:text-white/90"
                    dangerouslySetInnerHTML={{ __html: categorie.intro }}
                  />
                )}
              </div>

              {/* Image : petite sur mobile, grande sur desktop */}
              {categorie.image_url && (
                <div className="shrink-0 w-20 md:w-56 lg:w-72 mr-6 md:mr-0">
                  <img
                    src={categorie.image_url}
                    alt={categorie.nom}
                    className="w-full max-h-16 md:max-h-32 lg:max-h-40 object-contain drop-shadow-2xl"
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
                    currentCritere={critereId}
                    currentDir={dir}
                    labelFiltres={(categorie as any).label_filtres || undefined}
                  />
                </Suspense>
              </aside>
            )}

            {/* Grille solutions */}
            <div className="flex-1 min-w-0">
              <SolutionSortBar
                criteresMajeurs={criteresMajeurs}
                currentTri={tri}
                currentCritere={critereId}
                currentDir={dir}
                selectedTagIds={selectedTagIds}
                count={solutionsAvecNotes.length}
                hideNoteRedac={!(categorie as any).has_note_redac}
              />
              <SolutionList solutions={solutionsAvecNotes} categorieSlug={categorie.slug || ''} tri={tri} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
