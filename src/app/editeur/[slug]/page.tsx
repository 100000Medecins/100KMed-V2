import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getEditeurWithSolutions } from '@/lib/db/editeurs'
import { getCommunautesPubliques } from '@/lib/db/solution-communautes'
import { getDisplayPrixFront } from '@/lib/db/settings'
import { generateOrganizationJsonLd } from '@/lib/seo/jsonld'
import SolutionList from '@/components/solutions/SolutionList'
import EditeurCommunautes, { type EditeurCommunautesGroup } from '@/components/solutions/detail/EditeurCommunautes'
import { sanitizeHtml } from '@/lib/sanitize'
import Button from '@/components/ui/Button'
import { ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 3600 // ISR : 1 heure

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  try {
    const { editeur } = await getEditeurWithSolutions(params.slug)
    return {
      title: `${editeur.nom} — Éditeur de logiciels médicaux`,
      description: editeur.description || `Découvrez les solutions de ${editeur.nom} et les avis de médecins.`,
    }
  } catch {
    return { title: 'Éditeur' }
  }
}

// Retourne vide : les pages seront générées on-demand via ISR
// (generateStaticParams ne peut pas appeler cookies() au build time)
export async function generateStaticParams() {
  return []
}

export default async function EditeurPage(props: PageProps) {
  const params = await props.params;
  let result: Awaited<ReturnType<typeof getEditeurWithSolutions>>
  try {
    result = await getEditeurWithSolutions(params.slug)
  } catch {
    notFound()
  }
  const { editeur, solutions, parent } = result

  const displayPrixFront = await getDisplayPrixFront()

  // Communautés d'utilisateurs agrégées depuis le module solution_communautes
  // (communautés approuvées de chaque solution de l'éditeur).
  const communautesGroups: EditeurCommunautesGroup[] = await Promise.all(
    solutions.map(async (s) => {
      const sol = s as unknown as { id: string; nom: string | null; slug: string | null; categorie?: { slug?: string | null } | null }
      const communautes = await getCommunautesPubliques(sol.id)
      const catSlug = sol.categorie?.slug
      return {
        solutionNom: sol.nom || 'Solution',
        solutionHref: catSlug && sol.slug ? `/solutions/${catSlug}/${sol.slug}` : null,
        communautes,
      }
    })
  )

  const jsonLd = generateOrganizationJsonLd(editeur)

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Header éditeur */}
        <section className="bg-surface-light py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
              {/* Bloc texte */}
              <div className="flex items-start gap-6 lg:flex-1">
                {editeur.logo_url && (
                  <img
                    src={editeur.logo_url}
                    alt={editeur.logo_titre || editeur.nom || ''}
                    className="w-20 h-20 rounded-2xl object-contain bg-white shadow-card p-2 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-navy">
                    {editeur.nom_commercial || editeur.nom}
                  </h1>
                  {editeur.description && (
                    <div
                      className="prose-custom mt-5 max-w-2xl text-gray-600"
                      dangerouslySetInnerHTML={{ __html: editeur.description }}
                    />
                  )}
                  {editeur.website && (
                    <Button
                      href={editeur.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      size="md"
                      rightIcon={<ExternalLink className="w-4 h-4" />}
                      className="mt-6"
                    >
                      Visiter le site web
                    </Button>
                  )}
                </div>
              </div>

              {/* Carte maison-mère (groupe) */}
              {parent && (
                <Link
                  href={`/editeur/${parent.slug}`}
                  className="group block w-full shrink-0 rounded-card bg-white p-6 shadow-card transition hover:shadow-lg lg:w-80"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Fait partie du groupe
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    {parent.logo_url && (
                      <img
                        src={parent.logo_url}
                        alt={parent.logo_titre || parent.nom || ''}
                        className="h-14 w-14 shrink-0 rounded-xl object-contain bg-white ring-1 ring-gray-100 p-1.5"
                      />
                    )}
                    <span className="text-lg font-bold text-navy">
                      {parent.nom_commercial || parent.nom}
                    </span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-blue group-hover:gap-2.5 transition-all">
                    Voir la maison-mère
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Mot de l'éditeur */}
        {editeur.mot_editeur && (
          <section className="max-w-7xl mx-auto px-6 py-10">
            <h2 className="text-lg font-semibold text-navy mb-4">Mot de l&apos;éditeur</h2>
            <div className="bg-white rounded-card shadow-card p-6">
              <div
                className="prose-custom text-gray-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editeur.mot_editeur) }}
              />
            </div>
          </section>
        )}

        {/* Solutions de l'éditeur */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-lg font-semibold text-navy mb-6">
            Solutions ({solutions.length})
          </h2>
          <SolutionList solutions={solutions} tri="note_utilisateurs" displayPrixFront={displayPrixFront} />
        </section>

        {/* Communautés d'utilisateurs (agrégées des solutions de l'éditeur) */}
        <EditeurCommunautes groups={communautesGroups} />
      </main>
      <Footer />
    </>
  )
}
