import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — RGPD',
}

export default function RGPDPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16 prose-custom">
          <h1 className="text-2xl font-bold text-navy mb-8">
            Politique de Confidentialité
          </h1>
          <p>La politique de confidentialité et les informations RGPD seront disponibles prochainement.</p>
        </article>
      </main>
      <Footer />
    </>
  )
}
