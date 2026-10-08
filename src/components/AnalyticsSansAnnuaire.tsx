'use client'

import { Analytics } from '@vercel/analytics/next'

/**
 * Vercel Web Analytics, sauf sur les pages de l'annuaire : la charte de l'annuaire promet
 * qu'elles ne font l'objet d'aucune mesure d'audience.
 */
export default function AnalyticsSansAnnuaire() {
  return (
    <Analytics
      beforeSend={(evenement) => {
        const chemin = new URL(evenement.url).pathname
        if (chemin.startsWith('/annuaire') || chemin.startsWith('/mon-compte/annuaire')) return null
        return evenement
      }}
    />
  )
}
