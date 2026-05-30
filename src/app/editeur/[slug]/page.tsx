import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getEditeurWithSolutions } from '@/lib/db/editeurs'
import { generateOrganizationJsonLd } from '@/lib/seo/jsonld'
import SolutionList from '@/components/solutions/SolutionList'
import { sanitizeHtml } from '@/lib/sanitize'

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
  let editeur, solutions
  try {
    const result = await getEditeurWithSolutions(params.slug)
    editeur = result.editeur
    solutions = result.solutions
  } catch {
    notFound()
  }

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
            <div className="flex items-start gap-6">
              {editeur.logo_url && (
                <img
                  src={editeur.logo_url}
                  alt={editeur.logo_titre || editeur.nom || ''}
                  className="w-20 h-20 rounded-2xl object-contain bg-white shadow-card p-2"
                />
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-navy">
                  {editeur.nom_commercial || editeur.nom}
                </h1>
                {editeur.description && (
                  <div
                    className="prose-custom mt-2 max-w-2xl"
                    dangerouslySetInnerHTML={{ __html: editeur.description }}
                  />
                )}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                  {editeur.nb_employes && (
                    <span>{editeur.nb_employes} employés</span>
                  )}
                  {editeur.contact_ville && (
                    <span>{editeur.contact_ville}, {editeur.contact_pays}</span>
                  )}
                  {editeur.website && (
                    <a
                      href={editeur.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-blue hover:underline"
                    >
                      Site web →
                    </a>
                  )}
                </div>
              </div>
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
          <SolutionList solutions={solutions} />
        </section>
      </main>
      <Footer />
    </>
  )
}
