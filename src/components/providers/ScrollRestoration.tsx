'use client'

import { useEffect } from 'react'

export default function ScrollRestoration() {
  useEffect(() => {
    // Désactive la restauration automatique de scroll du navigateur
    // qui cause un saut visible au refresh (le navigateur restaure la position
    // avant que Next.js ait fini de rendre, puis Next.js remet en haut)
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  return null
}
