import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ContributeCTA from '@/components/article/ContributeCTA'
import type { PageStatique as PageStatiqueType } from '@/types/models'

interface PageStatiqueProps {
  page: PageStatiqueType
  breadcrumbLabel: string
}

export default function PageStatique({ page, breadcrumbLabel }: PageStatiqueProps) {
  return (
    <>
      <Navbar />

      {/* Breadcrumb bar */}
      <div className="pt-[72px] bg-surface-light border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Accueil', href: '/' },
              { label: breadcrumbLabel },
            ]}
          />
        </div>
      </div>

      {/* Article */}
      <article className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-extrabold text-navy leading-[1.2] tracking-tight mb-10">
            {page.titre}
          </h1>

          {/* Hero image */}
          {page.image_couverture && (
            <div className="w-full rounded-2xl overflow-hidden shadow-card mb-10">
              <img
                src={page.image_couverture}
                alt={page.titre}
                className="w-full aspect-[16/9] object-cover"
              />
            </div>
          )}

          {/* Content */}
          {page.contenu && (
            <div
              className="prose-custom"
              dangerouslySetInnerHTML={{ __html: page.contenu }}
            />
          )}
        </div>
      </article>

      {/* CTA Section */}
      <ContributeCTA />

      <Footer />
    </>
  )
}
