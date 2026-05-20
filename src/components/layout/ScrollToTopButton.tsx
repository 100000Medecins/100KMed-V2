'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const NEAR_BOTTOM_THRESHOLD = 800 // px restant à scroller en dessous = "proche du bas"

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function check() {
      const scrolled = window.scrollY
      const viewport = window.innerHeight
      const total = document.documentElement.scrollHeight
      // Visible si on a scrollé au moins 1 viewport (page assez longue ET on a déjà bougé)
      // ET qu'il reste moins de NEAR_BOTTOM_THRESHOLD à scroller (= proche du bas)
      const remaining = total - scrolled - viewport
      setVisible(scrolled > viewport && remaining < NEAR_BOTTOM_THRESHOLD)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Retour en haut de la page"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-accent-blue text-white shadow-lg hover:bg-accent-blue/90 hover:scale-105 transition-all flex items-center justify-center"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
