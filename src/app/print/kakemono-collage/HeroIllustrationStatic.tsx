/**
 * Version statique de <HeroIllustration /> pour l'export kakemono.
 *
 * Reproduit fidèlement la structure du composant `src/components/sections/HeroIllustration.tsx`
 * (mêmes positions, mêmes classes glassmorphism, mêmes contenus) mais sans
 * animations float : les rotations sont appliquées en dur via `transform`
 * pour que le screenshot Puppeteer capture une frame visuellement cohérente
 * avec ce que l'œil voit en mouvement sur le site.
 *
 * Angles choisis = valeurs `baseR` du composant source, légèrement amplifiés
 * pour que la disposition "papiers éparpillés" se voie sur un kakemono
 * imprimé à distance.
 */

interface Props {
  nbSolutionsLabel:   string
  nbEvaluationsLabel: string
  nbInscritsLabel:    string
  nbAcronymesLabel:   string
}

const R = {
  segur:          7,  // inversé (-7 → +7)
  rpps:          -5,  // inversé (+5 → -5)
  leftCard:      -8,
  rightCard:      6,
  centralCard:   -2,
  badgeInscrits: -4,
  badgeAcronymes: 5,
  citation:       3,
  badgeAvis:     -5,
  badgeSolutions: 4,
}

export default function HeroIllustrationStatic({
  nbSolutionsLabel,
  nbEvaluationsLabel,
  nbInscritsLabel,
  nbAcronymesLabel,
}: Props) {
  return (
    // Canvas agrandi à 480×400 (au lieu de 420×320) pour donner :
    // - +30px de marge en haut → les rotations des badges Ségur/RPPS ne sont plus rabotées
    // - +30px de marge bas et latéraux → moins de débordement
    // - +60px d'espace horizontal au milieu → cartes latérales écartées de la centrale
    <div className="relative w-[480px] h-[400px]">

      {/* Badge Ségur — remonté (était à top=55, masquait trop la carte du dessous) */}
      <div className="absolute top-[25px] left-[10px] z-10" style={{ transform: `rotate(${R.segur}deg)` }}>
        <div className="bg-emerald-500/25 backdrop-blur border border-emerald-400/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <span className="text-emerald-400 text-sm">✓</span>
          <span className="text-white/90 text-xs font-medium">Ségur certifié</span>
        </div>
      </div>

      {/* Badge RPPS — remonté davantage (25→10) pour libérer "Interface intuitive" */}
      <div className="absolute top-[10px] right-[8px] z-10" style={{ transform: `rotate(${R.rpps}deg)` }}>
        <div className="bg-blue-500/20 backdrop-blur border border-blue-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <span className="text-blue-300 text-sm">⚡</span>
          <span className="text-white/90 text-xs font-medium">RPPS connecté</span>
        </div>
      </div>

      {/* Carte gauche "Gain de temps" — remontée (top 68→42) pour être moins masquée par Ségur */}
      <div className="absolute top-[42px] left-[14px]" style={{ transform: `rotate(${R.leftCard}deg)` }}>
        <div
          style={{ background: 'rgba(255,255,255,0.08)' }}
          className="w-48 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl"
        >
          <div className="flex gap-0.5 mb-1.5">
            {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
          </div>
          <p className="text-white/70 text-xs leading-relaxed">&quot;Gain de temps considérable sur la télétransmission.&quot;</p>
          <p className="text-white/35 text-[10px] mt-1">Dr. C. — Péd. · Nantes</p>
        </div>
      </div>

      {/* Carte droite "Interface intuitive" — remontée (top 62→38) pour être moins masquée par RPPS */}
      <div className="absolute top-[38px] right-[0px]" style={{ transform: `rotate(${R.rightCard}deg)` }}>
        <div
          style={{ background: 'rgba(255,255,255,0.08)' }}
          className="w-44 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl"
        >
          <div className="flex gap-0.5 mb-1.5">
            {[1,2,3,4].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
            <span className="text-white/30 text-xs">★</span>
          </div>
          <p className="text-white/70 text-xs leading-relaxed">&quot;Interface intuitive, prise en main en 20 min.&quot;</p>
          <p className="text-white/35 text-[10px] mt-1">Dr. L. — MG · Bordeaux</p>
        </div>
      </div>

      {/* Carte centrale principale — remontée pour suivre les cartes latérales */}
      <div className="absolute top-[105px] left-1/2 z-20" style={{ transform: `translateX(-50%) rotate(${R.centralCard}deg)` }}>
        <div
          style={{ background: 'rgba(255,255,255,0.15)' }}
          className="w-56 backdrop-blur-md border border-white/25 rounded-2xl p-4 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/40 flex items-center justify-center text-base">🩺</div>
            <div>
              <p className="text-white text-sm font-semibold">Logiciel de gestion</p>
              <div className="flex gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
              </div>
            </div>
          </div>
          <p className="text-white/70 text-xs leading-relaxed">&quot;Enfin un outil qui s&apos;adapte vraiment à notre flux de patients.&quot;</p>
          <p className="text-white/40 text-[10px] mt-1.5">Dr. M. — MG · Strasbourg</p>
        </div>
      </div>

      {/* Badge solutions — remonté pour toucher le bas-droit du bloc central */}
      <div className="absolute bottom-[105px] right-[60px] z-30" style={{ transform: `rotate(${R.badgeSolutions}deg)` }}>
        <div className="bg-purple-500/25 backdrop-blur border border-purple-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <span className="text-purple-300 text-sm">🛠</span>
          <span className="text-white/90 text-xs font-medium">{nbSolutionsLabel}</span>
        </div>
      </div>

      {/* Badge avis — remonté pour toucher le bas du bloc central */}
      <div className="absolute bottom-[70px] left-[140px] z-30" style={{ transform: `rotate(${R.badgeAvis}deg)` }}>
        <div className="bg-yellow-500/20 backdrop-blur border border-yellow-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
          <span className="text-yellow-400 text-sm">★</span>
          <span className="text-white/90 text-xs font-medium">{nbEvaluationsLabel}</span>
        </div>
      </div>

      {/* Badge inscrits — sur la carte centrale (top suit la centrale désormais à 105) */}
      <div className="absolute top-[92px] left-1/2 z-30" style={{ transform: `translateX(-50%) rotate(${R.badgeInscrits}deg)` }}>
        <div className="bg-teal-500/20 backdrop-blur border border-teal-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
          <span className="text-teal-300 text-sm">👥</span>
          <span className="text-white/90 text-xs font-medium">{nbInscritsLabel}</span>
        </div>
      </div>

      {/* Badge acronymes — collé au bord gauche */}
      <div className="absolute bottom-[180px] left-[2px] z-30" style={{ transform: `rotate(${R.badgeAcronymes}deg)` }}>
        <div className="bg-indigo-500/25 backdrop-blur border border-indigo-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <span className="text-indigo-300 text-sm">🔤</span>
          <span className="text-white/90 text-xs font-medium">{nbAcronymesLabel}</span>
        </div>
      </div>

      {/* Mini citation "Parfait pour ma maison de santé" — remontée pour toucher le bas-gauche du bloc central */}
      <div className="absolute bottom-[105px] left-[6px] z-20" style={{ transform: `rotate(${R.citation}deg)` }}>
        <div
          style={{ background: 'rgba(255,255,255,0.09)' }}
          className="backdrop-blur border border-white/15 rounded-xl px-2.5 py-1.5 shadow-lg"
        >
          <p className="text-white/70 text-[10px] leading-relaxed">&quot;Parfait pour ma maison de santé.&quot;</p>
          <p className="text-white/35 text-[10px]">Dr. A. — MG · Lyon</p>
        </div>
      </div>

    </div>
  )
}
