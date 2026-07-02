'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CITATIONS, type Citation } from '@/lib/constants/citations'

const ROTATION_MS = 8000

/**
 * Carrousel de citations aléatoires affiché en tête du catalogue Solutions.
 * - tirage aléatoire au montage (on part de l'index 0 côté SSR pour éviter le
 *   mismatch d'hydratation, puis on randomise dans un effet client)
 * - auto-rotation toutes les 8 s, en pause au survol et désactivée si
 *   l'utilisateur a demandé `prefers-reduced-motion`
 * - navigation manuelle au clic (flèches ‹ ›)
 * Données : src/lib/constants/citations.ts
 */
export default function CitationCarousel({ citations }: { citations?: Citation[] }) {
  // Données fournies par le serveur (table `citations`) ; fallback sur la constante front.
  const list = citations && citations.length > 0 ? citations : CITATIONS

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useRef(false)

  // Tirage aléatoire au montage uniquement (évite le mismatch SSR/CSR).
  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    setIndex(Math.floor(Math.random() * list.length))
  }, [list.length])

  // Auto-rotation : relancée à chaque changement d'index → cadence régulière de 8 s
  // après une navigation manuelle comme automatique.
  useEffect(() => {
    if (paused || reducedMotion.current) return
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), ROTATION_MS)
    return () => clearInterval(id)
  }, [index, paused, list.length])

  const go = (delta: number) =>
    setIndex((i) => (i + delta + list.length) % list.length)

  const citation = list[index]

  return (
    <div
      className="relative px-9 sm:px-12 py-1 text-center"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Citation"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p key={index} className="text-[13px] md:text-sm italic text-navy/55 leading-snug">
        « {citation.text} »
        {citation.auteur && (
          <span className="not-italic font-medium text-navy/40"> — {citation.auteur}</span>
        )}
      </p>

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Citation précédente"
        className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-navy/60 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Citation suivante"
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-navy/60 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
