'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type PopoverState = { text: string; sigle: string; top: number; left: number } | null

/**
 * Infobulle des acronymes déclenchée au clic/tap (en complément du `title`
 * natif qui ne s'affiche qu'au survol — donc invisible sur tactile).
 *
 * Gestionnaire unique posé au niveau document : il cible tous les
 * `<abbr data-acronym>` du site, qu'ils soient générés en React
 * (AcronymText) ou injectés en HTML (injectAcronymsInHtml).
 */
export default function AcronymPopover() {
  const [popover, setPopover] = useState<PopoverState>(null)

  const close = useCallback(() => setPopover(null), [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null
      if (!el) return
      // Clic dans l'infobulle elle-même : ne pas la fermer.
      if (el.closest('[data-acronym-popover]')) return
      const abbr = el.closest('abbr[data-acronym]') as HTMLElement | null
      if (abbr) {
        e.preventDefault()
        const text = abbr.getAttribute('title') || ''
        if (!text) return
        const sigle = (abbr.textContent || '').trim()
        const rect = abbr.getBoundingClientRect()
        setPopover({
          text,
          sigle,
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        })
      } else {
        setPopover(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopover(null)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    // capture: true pour fermer aussi sur le scroll d'un conteneur interne.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [close])

  if (!popover) return null

  // Recentrage horizontal pour ne jamais déborder de l'écran (marges de 12px).
  const HALF = 140 // moitié de la largeur max (280px)
  const left = Math.min(
    Math.max(popover.left, HALF + 12),
    window.innerWidth - HALF - 12,
  )

  return (
    <div
      data-acronym-popover
      role="tooltip"
      className="fixed z-[100] -translate-x-1/2 max-w-[280px] rounded-xl bg-navy text-white text-sm leading-snug px-4 py-3 shadow-xl"
      style={{ top: popover.top, left }}
    >
      {popover.text}
      {popover.sigle && (
        <Link
          href={`/glossaire#${encodeURIComponent(popover.sigle)}`}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors"
          onClick={close}
        >
          Voir dans le glossaire
          <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  )
}
