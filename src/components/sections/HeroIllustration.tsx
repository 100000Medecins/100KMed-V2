'use client'

import { motion } from 'framer-motion'

// ─── Paramètres de flottement par élément ────────────────────────────────────
// y      : [bas, haut] en px
// r      : oscillation de rotation en degrés autour de la position de base
// dur    : durée d'un demi-cycle (s)
// delay  : délai initial (s) — décale les éléments pour qu'ils ne soient jamais en phase

const FLOATS = {
  leftCard:       { y: [-5,  4], r: 0.9,  dur: 5.1, delay: 0.3, baseR: -5 },
  rightCard:      { y: [-3,  6], r: 0.7,  dur: 4.6, delay: 1.2, baseR:  4 },
  centralCard:    { y: [-6,  3], r: 0.5,  dur: 5.8, delay: 0.6, baseR:  0 },
  badgeSolutions: { y: [-4,  5], r: 1.0,  dur: 4.2, delay: 1.7, baseR: -2 },
  badgeAvis:      { y: [-5,  3], r: 1.2,  dur: 3.9, delay: 0.9, baseR: -4 },
  badgeInscrits:  { y: [-3,  5], r: 0.8,  dur: 5.3, delay: 0.1, baseR: -3 },
  citation:       { y: [-4,  4], r: 0.9,  dur: 4.7, delay: 1.5, baseR:  2 },
  segur:          { y: [-3,  3], r: 0.4,  dur: 6.0, delay: 0.4, baseR: -2 },
  rpps:           { y: [-4,  2], r: 0.5,  dur: 5.5, delay: 2.0, baseR:  2 },
}

type FloatKey = keyof typeof FLOATS

function floatProps(key: FloatKey) {
  const f = FLOATS[key]
  return {
    animate: {
      y: f.y,
      rotate: [f.baseR - f.r, f.baseR + f.r],
    },
    transition: {
      duration: f.dur,
      delay: f.delay,
      ease: 'easeInOut' as const,
      repeat: Infinity,
      repeatType: 'mirror' as const,
    },
  }
}

// ─── Composant ───────────────────────────────────────────────────────────────

interface Props {
  nbSolutionsLabel:   string | null
  nbEvaluationsLabel: string | null
  nbInscritsLabel:    string | null
}

export default function HeroIllustration({ nbSolutionsLabel, nbEvaluationsLabel, nbInscritsLabel }: Props) {
  return (
    <div className="relative w-[420px] h-[320px]">

      {/* Badge Ségur — haut gauche */}
      <div className="absolute top-[2px] left-[12px] z-10">
        <motion.div {...floatProps('segur')}
          className="bg-emerald-500/25 backdrop-blur border border-emerald-400/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg"
        >
          <span className="text-emerald-400 text-sm">✓</span>
          <span className="text-white/90 text-xs font-medium">Ségur certifié</span>
        </motion.div>
      </div>

      {/* Badge RPPS — haut droite */}
      <div className="absolute top-[0px] right-[8px] z-10">
        <motion.div {...floatProps('rpps')}
          className="bg-blue-500/20 backdrop-blur border border-blue-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg"
        >
          <span className="text-blue-300 text-sm">⚡</span>
          <span className="text-white/90 text-xs font-medium">RPPS connecté</span>
        </motion.div>
      </div>

      {/* Carte — derrière gauche */}
      <div className="absolute top-[48px] left-[4px]">
        <motion.div {...floatProps('leftCard')}
          className="w-48 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex gap-0.5 mb-1.5">
            {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
          </div>
          <p className="text-white/70 text-xs leading-relaxed">"Gain de temps considérable sur la télétransmission."</p>
          <p className="text-white/35 text-[10px] mt-1">Dr. C. — Péd. · Nantes</p>
        </motion.div>
      </div>

      {/* Carte — derrière droite */}
      <div className="absolute top-[42px] right-[4px]">
        <motion.div {...floatProps('rightCard')}
          className="w-44 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex gap-0.5 mb-1.5">
            {[1,2,3,4].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
            <span className="text-white/30 text-xs">★</span>
          </div>
          <p className="text-white/70 text-xs leading-relaxed">"Interface intuitive, prise en main en 20 min."</p>
          <p className="text-white/35 text-[10px] mt-1">Dr. L. — MG · Bordeaux</p>
        </motion.div>
      </div>

      {/* Carte centrale principale */}
      <div className="absolute top-[82px] left-1/2 -translate-x-1/2 z-20">
        <motion.div {...floatProps('centralCard')}
          className="w-56 backdrop-blur-md border border-white/25 rounded-2xl p-4 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.15)' }}
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
          <p className="text-white/70 text-xs leading-relaxed">"Enfin un outil qui s'adapte vraiment à notre flux de patients."</p>
          <p className="text-white/40 text-[10px] mt-1.5">Dr. M. — MG · Strasbourg</p>
        </motion.div>
      </div>

      {/* Badge solutions */}
      {nbSolutionsLabel && (
        <div className="absolute bottom-[55px] right-[6px] z-30">
          <motion.div {...floatProps('badgeSolutions')}
            className="bg-purple-500/25 backdrop-blur border border-purple-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg"
          >
            <span className="text-purple-300 text-sm">🛠</span>
            <span className="text-white/90 text-xs font-medium">{nbSolutionsLabel}</span>
          </motion.div>
        </div>
      )}

      {/* Badge avis */}
      {nbEvaluationsLabel && (
        <div className="absolute bottom-[28px] left-[100px] z-30">
          <motion.div {...floatProps('badgeAvis')}
            className="bg-yellow-500/20 backdrop-blur border border-yellow-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl"
          >
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white/90 text-xs font-medium">{nbEvaluationsLabel}</span>
          </motion.div>
        </div>
      )}

      {/* Badge inscrits */}
      {nbInscritsLabel && (
        <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-30">
          <motion.div {...floatProps('badgeInscrits')}
            className="bg-teal-500/20 backdrop-blur border border-teal-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl"
          >
            <span className="text-teal-300 text-sm">👥</span>
            <span className="text-white/90 text-xs font-medium">{nbInscritsLabel}</span>
          </motion.div>
        </div>
      )}

      {/* Mini citation */}
      <div className="absolute bottom-[52px] left-[6px] z-20">
        <motion.div {...floatProps('citation')}
          className="backdrop-blur border border-white/15 rounded-xl px-2.5 py-1.5 shadow-lg"
          style={{ background: 'rgba(255,255,255,0.09)' }}
        >
          <p className="text-white/70 text-[10px] leading-relaxed">"Parfait pour ma maison de santé."</p>
          <p className="text-white/35 text-[10px]">Dr. A. — MG · Lyon</p>
        </motion.div>
      </div>

    </div>
  )
}
