import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { PartyPopper, Gift, BatteryCharging, CreditCard, HeartPulse } from 'lucide-react'
import { GAGNANTS, JEU_CONCOURS } from '@/lib/data/gagnants'

export const metadata: Metadata = {
  title: `${JEU_CONCOURS.titre} — ${JEU_CONCOURS.sousTitre}`,
  description: JEU_CONCOURS.intro,
}

// Icône selon le lot (robuste au réordonnancement des gagnants).
function iconForPrize(prix: string) {
  const p = prix.toLowerCase()
  if (p.includes('ecg') || p.includes('ekg')) return HeartPulse
  if (p.includes('vitale') || p.includes('carte')) return CreditCard
  if (p.includes('batterie')) return BatteryCharging
  return Gift
}

export default function JeuConcoursPage() {
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

        {/* Gagnants — 3 lots distincts, sans hiérarchie (cartes à égalité) */}
        {GAGNANTS.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 -mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              {GAGNANTS.map((g, i) => {
                const Icon = iconForPrize(g.prix)
                return (
                  <div key={i} className="bg-white rounded-card shadow-card p-6 text-center flex flex-col">
                    <div className="mx-auto w-14 h-14 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="text-lg font-bold text-navy leading-snug">{g.nom}</div>
                    {g.ville && <div className="text-sm text-gray-400">{g.ville}</div>}
                    <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">remporte</div>
                    <div className="mt-0.5 text-sm font-semibold text-accent-blue">{g.prix}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto px-4 pb-16 pt-10 text-center">
          <p className="text-gray-500 text-sm">
            Félicitations aux gagnants et merci à toutes et tous pour votre participation&nbsp;!
          </p>
          <a
            href="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/reglement-jeu-concours-wonca-2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm font-medium text-accent-blue hover:underline"
          >
            Règlement du jeu (PDF)
          </a>
        </section>
      </main>
      <Footer />
    </>
  )
}
