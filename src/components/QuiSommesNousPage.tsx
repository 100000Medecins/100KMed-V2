import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ContributeCTA from '@/components/article/ContributeCTA'
import type { PageStatique, SyndicatFoundateur } from '@/types/models'

interface Props {
  page: PageStatique
}

export default function QuiSommesNousPage({ page }: Props) {
  const syndicats: SyndicatFoundateur[] = Array.isArray(page.metadata) ? page.metadata : []

  return (
    <>
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-[72px] bg-surface-light border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: 'Qui sommes-nous ?' },
            ]}
          />
        </div>
      </div>

      <article className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-extrabold text-navy leading-[1.2] tracking-tight mb-10">
            {page.titre}
          </h1>

          {/* Image de couverture */}
          {page.image_couverture && (
            <div className="w-full rounded-2xl overflow-hidden shadow-card mb-10">
              <img
                src={page.image_couverture}
                alt={page.titre}
                className="w-full aspect-[16/9] object-cover"
              />
            </div>
          )}

          {/* Contenu principal */}
          {page.contenu && (
            <div
              className="prose-custom mb-14"
              dangerouslySetInnerHTML={{ __html: page.contenu }}
            />
          )}

          {/* Syndicats fondateurs */}
          {syndicats.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-navy mb-8">Nos membres fondateurs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {syndicats.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-card shadow-card border border-gray-100 p-6 flex flex-col items-center text-center"
                  >
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-center mb-4">
                      <img
                        src={s.logo_url}
                        alt={s.nom}
                        className="max-h-16 max-w-[140px] object-contain"
                      />
                    </div>


                    {/* Citation */}
                    <blockquote className="text-sm text-gray-600 italic leading-relaxed flex-1 mb-4">
                      &laquo;&nbsp;{s.citation}&nbsp;&raquo;
                    </blockquote>

                    {/* Président */}
                    <div className="border-t border-gray-100 pt-4 w-full">
                      <p className="text-sm font-semibold text-navy">{s.presidents}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.titre}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

      <ContributeCTA />
      <Footer />
    </>
  )
}
