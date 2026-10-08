import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// Annuaire entre médecins : privé (connexion + preuve PSC), jamais indexé.
export const metadata: Metadata = {
  title: 'Annuaire des confrères',
  robots: { index: false, follow: false },
}

export default function AnnuaireLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
      <Footer />
    </>
  )
}
