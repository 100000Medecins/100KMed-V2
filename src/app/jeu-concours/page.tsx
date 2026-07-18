import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Trophy, Medal, Award, PartyPopper } from 'lucide-react'
import { GAGNANTS, JEU_CONCOURS } from '@/lib/data/gagnants'

export const metadata: Metadata = {
  title: `${JEU_CONCOURS.titre} — ${JEU_CONCOURS.sousTitre}`,
  description: JEU_CONCOURS.intro,
}

const PODIUM = [
  { rang: 1, icon: Trophy, ring: 'ring-rating-star', bg: 'bg-rating-star/10', text: 'text-rating-star', order: 'sm:order-2', lift: 'sm:-mt-6' },
  { rang: 2, icon: Medal, ring: 'ring-gray-300', bg: 'bg-gray-100', text: 'text-gray-500', order: 'sm:order-1', lift: '' },
  { rang: 3, icon: Award, ring: 'ring-accent-orange/40', bg: 'bg-accent-orange/10', text: 'text-accent-orange', order: 'sm:order-3', lift: '' },
] as const

export default function JeuConcoursPage() {
  const top3 = GAGNANTS.filter((g) => g.rang >= 1 && g.rang <= 3).sort((a, b) => a.rang - b.rang)
  const autres = GAGNANTS.filter((g) => g.rang > 3).sort((a, b) => a.rang - b.rang)

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-navy text-white">
          <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-5">
              <PartyPopper className="w-4 h-4" /> {JEU_CONCOURS.titre}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4">{JEU_CONCOURS.sousTitre}</h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">{JEU_CONCOURS.intro}</p>
            {JEU_CONCOURS.dateTirage && (
              <p className="text-white/50 text-sm mt-4">Tirage au sort : {JEU_CONCOURS.dateTirage}</p>
            )}
          </div>
        </section>

        {/* Podium (top 3) */}
        {top3.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 -mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end">
              {top3.map((g) => {
                const p = PODIUM.find((x) => x.rang === g.rang)!
                const Icon = p.icon
                return (
                  <div key={g.rang} className={`${p.order} ${p.lift}`}>
                    <div className={`bg-white rounded-card shadow-card ring-1 ${p.ring} p-6 text-center`}>
                      <div className={`mx-auto w-14 h-14 rounded-full ${p.bg} ${p.text} flex items-center justify-center mb-3`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${p.text} mb-1`}>
                        {g.rang === 1 ? '1er prix' : `${g.rang}e prix`}
                      </div>
                      <div className="text-lg font-bold text-navy">{g.nom}</div>
                      {g.ville && <div className="text-sm text-gray-400">{g.ville}</div>}
                      <div className="mt-2 text-sm font-medium text-gray-600">{g.prix}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Autres gagnants */}
        {autres.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 py-12">
            <h2 className="text-xl font-bold text-navy mb-6 text-center">Autres gagnants</h2>
            <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
              {autres.map((g) => (
                <div key={g.rang} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-surface-light text-navy text-sm font-bold flex items-center justify-center">
                    {g.rang}
                  </span>
                  <span className="flex-1 font-medium text-navy">
                    {g.nom}
                    {g.ville && <span className="text-gray-400 font-normal"> · {g.ville}</span>}
                  </span>
                  <span className="text-sm text-gray-500">{g.prix}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto px-4 pb-16 pt-4 text-center">
          <p className="text-gray-500 text-sm">
            Félicitations aux gagnants et merci à toutes et tous pour votre participation !
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
