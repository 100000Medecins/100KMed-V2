import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getPageBySlug } from '@/lib/db/pages'

export const metadata: Metadata = {
  title: 'RGPD / Cookies — 100000médecins.org',
  description: 'Politique de confidentialité et gestion des cookies du site 100000medecins.org',
}

export default async function RGPDPage() {
  // Pas de fallback hardcodé : le contenu de rgpd vit en BDD (pages_statiques).
  // Si la requête échoue, on laisse Next servir error.tsx plutôt que d'afficher
  // une version périmée. Cf. decision 2026-05-31.
  const dbPage = await getPageBySlug('rgpd')

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
