import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Transparence',
}

export default function TransparencePage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16 prose-custom">
          <h1 className="text-2xl font-bold text-navy mb-8">Transparence</h1>
          <p>
            Notre engagement de transparence envers les professionnels de santé
            sera détaillé ici prochainement.
          </p>
        </article>
      </main>
      <Footer />
    </>
  )
}
