export const revalidate = 3600 // ISR 1h (au lieu de 5 min) — réduit la CPU Vercel Fluid ; les modifs admin revalident à la volée.

import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { getCategorieBySlug } from '@/lib/db/categories'
import {
  getSolutions,
  getNotesGlobalesRedac,
  getNotesUtilisateursGlobales,
  getNbNotesUtilisateurs,
  getSolutionsTagsMap,
  getNotesParCritere,
} from '@/lib/db/solutions'
import { getTags, getCriteresMajeurs } from '@/lib/db/misc'
import { getDisplayPrixFront } from '@/lib/db/settings'
import { getCitationsActives } from '@/lib/db/citations'
import CitationCarousel from '@/components/CitationCarousel'
import SolutionsCategoryBrowser from '@/components/solutions/SolutionsCategoryBrowser'
import SolutionsCategoryView from '@/components/solutions/SolutionsCategoryView'
import CategoryCallout from '@/components/solutions/CategoryCallout'
import { CATEGORY_CALLOUTS } from '@/lib/constants/category-callouts'
import { filterAndSortSolutions, type CategoryBrowseData } from '@/lib/solutions-filter-sort'

/**
 * ISR à la demande (page ● au lieu de ƒ). Le filtrage/tri (qui lisait `searchParams` côté serveur,
 * seul déclencheur dynamique restant) est désormais fait côté client dans SolutionsCategoryBrowser.
 */
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ idCategorie: string }>
}

/**
 * Transforme un fragment HTML (intro riche) en texte plat tronqué, utilisable
 * comme meta description de secours quand `meta_description` n'est pas renseignée.
 */
function buildMetaFromHtml(raw: string, max = 160): string {
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) return { title: 'Solutions' }
  // meta_description : colonne dédiée (texte simple, contrôle SEO). Fallback :
  // extrait nettoyé de l'intro HTML, puis phrase générique.
  const metaDedie = (categorie as { meta_description?: string | null }).meta_description?.trim()
  const description =
    metaDedie ||
    (categorie.intro ? buildMetaFromHtml(categorie.intro) : '') ||
    `Comparez les meilleurs logiciels de ${categorie.nom} grâce aux avis de médecins.`
  return {
    title: `${categorie.nom} — Comparatif logiciels médicaux`,
    description,
  }
}

// Le flag has_note_redac sur la catégorie contrôle l'affichage du tri par note rédaction

export default async function SolutionsPage(props: PageProps) {
  const params = await props.params;

  // Ancien format Quasar : slug catégorie en CamelCase. Redirection 301 vers minuscules.
  // Pour les vrais renommages (LogicielsMetiers → logiciels-metiers), cf next.config.mjs.
  if (params.idCategorie !== params.idCategorie.toLowerCase()) {
    redirect(`/solutions/${params.idCategorie.toLowerCase()}`)
  }

  const categorie = await getCategorieBySlug(params.idCategorie).catch(() => null)
  if (!categorie) notFound()

  // On charge TOUTES les solutions de la catégorie + TOUTES les données de tri/filtre d'un coup
  // (aucune lecture de searchParams côté serveur → page statique). Filtrage/tri fait côté client.
  const solutions = await getSolutions({ categorieId: categorie.id })
  const solutionIds = solutions.map((s) => s.id)

  const [tags, criteresMajeurs, notesRedac, notesUtilisateurs, nbNotesMap, displayPrixFront, citations, solutionTags] = await Promise.all([
    getTags(categorie.id),
    getCriteresMajeurs(categorie.id),
    getNotesGlobalesRedac(solutionIds),
    getNotesUtilisateursGlobales(solutionIds),
    getNbNotesUtilisateurs(solutionIds),
    getDisplayPrixFront(),
    getCitationsActives(),
    getSolutionsTagsMap(solutionIds),
  ])

  const critereNotes = await getNotesParCritere(solutionIds, criteresMajeurs.map((c) => c.id))

  const browseData: CategoryBrowseData = {
    notesRedac, notesUtilisateurs, nbNotesMap, solutionTags, critereNotes, displayPrixFront,
  }

  const categorieSlug = categorie.slug || ''
  const hasNoteRedac = !!categorie.has_note_redac
  const labelFiltres = categorie.label_filtres || undefined
  const callout = CATEGORY_CALLOUTS[categorieSlug]

  // Vue par défaut (tri note_utilisateurs, sans filtre) rendue côté serveur → sert de fallback
  // au <Suspense> : garantit que la liste complète des solutions est dans le HTML statique (SEO).
  const defaultEnriched = filterAndSortSolutions(
    solutions,
    { selectedTagIds: [], tri: 'note_utilisateurs', critereId: '', dir: 'desc' },
    browseData,
  )

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        {/* Hero catégorie */}
        <section className="bg-hero-gradient pb-4 md:pb-14">
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-3 md:pb-12 min-[1150px]:pl-[200px]">
            <Breadcrumb variant="light" items={[{ label: 'Accueil', href: '/' }, { label: 'Comparatifs', href: '/comparatifs' }, { label: categorie.nom }]} />
          </div>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 md:gap-10">
              <div className="flex-1">
                {/* Titre */}
                <h1 className="text-lg md:text-3xl font-bold text-white mb-0 md:mb-6 flex items-center gap-3">
                  {categorie.icon && <span className="hidden md:inline text-2xl md:text-3xl">{categorie.icon}</span>}
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

            {/* Encadré de renvoi externe (ex. IA documentaires → cadre juridique).
                Hors du flex row → pleine largeur, visible mobile ET desktop. */}
            {callout && (
              <div className="mt-4 md:mt-6">
                <CategoryCallout callout={callout} />
              </div>
            )}
          </div>
        </section>

        {/* Citation aléatoire (carrousel) */}
        <section className="max-w-7xl mx-auto px-6 pt-4 md:pt-6">
          <CitationCarousel citations={citations} />
        </section>

        {/* Filtres + liste. Le tri/filtre lit `useSearchParams` (client) → sous <Suspense> pour
            garder la page statique. Fallback = vue par défaut rendue serveur (SEO : solutions
            présentes dans le HTML), remplacée au montage par la vue pilotée par l'URL. */}
        <Suspense
          fallback={
            <SolutionsCategoryView
              enriched={defaultEnriched}
              tags={tags}
              criteresMajeurs={criteresMajeurs}
              selectedTagIds={[]}
              tri="note_utilisateurs"
              critereId=""
              dir="desc"
              displayPrixFront={displayPrixFront}
              categorieSlug={categorieSlug}
              hasNoteRedac={hasNoteRedac}
              labelFiltres={labelFiltres}
            />
          }
        >
          <SolutionsCategoryBrowser
            solutions={solutions}
            tags={tags}
            criteresMajeurs={criteresMajeurs}
            data={browseData}
            categorieSlug={categorieSlug}
            hasNoteRedac={hasNoteRedac}
            labelFiltres={labelFiltres}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
