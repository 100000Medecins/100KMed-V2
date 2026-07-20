import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { PartyPopper, Gift, BatteryCharging, CreditCard, HeartPulse } from 'lucide-react'
import { GAGNANTS, JEU_CONCOURS } from '@/lib/data/gagnants'

export const metadata: Metadata = {
  title: `${JEU_CONCOURS.titre} — ${JEU_CONCOURS.sousTitre}`,
  description: JEU_CONCOURS.intro,
}

// Icône selon le lot (repli quand pas de photo ; robuste au réordonnancement).
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
            {JEU_CONCOURS.afficheUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={JEU_CONCOURS.afficheUrl}
                alt="Affiche du 30e congrès WONCA Europe 2026"
                className="mx-auto mb-8 w-auto max-h-72 rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            )}
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
                    {g.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={g.image} alt={g.prix} className="mx-auto h-24 w-auto object-contain mb-4" />
                    ) : (
                      <div className="mx-auto w-14 h-14 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-4">
                        <Icon className="w-7 h-7" />
                      </div>
                    )}
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

        {/* Invitation au prochain jeu concours */}
        {JEU_CONCOURS.conclusion && (
          <section className="max-w-2xl mx-auto px-4 pt-14 text-center">
            <p className="text-gray-600 text-base leading-relaxed">{JEU_CONCOURS.conclusion}</p>
          </section>
        )}

        <section className="max-w-3xl mx-auto px-4 pb-16 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            Félicitations aux gagnants et merci à toutes et tous pour votre participation&nbsp;!
          </p>
          {JEU_CONCOURS.reglementUrl && (
            <a
              href={JEU_CONCOURS.reglementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm font-medium text-accent-blue hover:underline"
            >
              Règlement du jeu (PDF)
            </a>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
