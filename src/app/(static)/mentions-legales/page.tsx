import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getPageBySlug } from '@/lib/db/pages'

export const metadata: Metadata = {
  title: 'Mentions légales — 100000médecins.org',
  description: 'Mentions légales du site 100000medecins.org',
}

export default async function MentionsLegalesPage() {
  // Même principe que /cgu : contenu en BDD (pages_statiques), pas de fallback hardcodé.
  const dbPage = await getPageBySlug('mentions-legales')

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">{dbPage.titre}</h1>
          <div
            className="space-y-8 text-sm text-gray-700 leading-relaxed prose-custom"
            dangerouslySetInnerHTML={{ __html: dbPage.contenu || '' }}
          />
        </article>
      </main>
      <Footer />
    </>
  )
}
