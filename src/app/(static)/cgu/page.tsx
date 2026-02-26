import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
}

export default function CGUPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16 prose-custom">
          <h1 className="text-2xl font-bold text-navy mb-8">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p>Les conditions générales d&apos;utilisation seront disponibles prochainement.</p>
        </article>
      </main>
      <Footer />
    </>
  )
}
