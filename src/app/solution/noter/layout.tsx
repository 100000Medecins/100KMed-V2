import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Parcours d'évaluation (formulaire) — pas de contenu à indexer.
 * Ce layout couvre /solution/noter ET /solution/noter/[...slug].
 * noindex explicite : la route est laissée crawlable dans robots.txt pour que
 * Googlebot voie ce noindex et retire l'URL de l'index (cf. audit SEO 2026-07-19).
 * Un simple Disallow robots.txt ne suffit pas : il bloque le crawl mais pas l'indexation.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
