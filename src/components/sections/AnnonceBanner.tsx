'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import type { Annonce } from '@/lib/db/annonces'

// Couleur du bandeau selon `variante` (thème Tailwind du projet).
const VARIANTS: Record<string, string> = {
  info: 'bg-accent-blue text-white',
  success: 'bg-rating-green text-white',
  warning: 'bg-accent-orange text-white',
}

const STORAGE_KEY = 'annonces_fermees'

/**
 * Bandeau(x) d'annonce en haut de l'accueil. Reçoit les annonces déjà filtrées
 * côté serveur (actives + dans la fenêtre de dates). Empile un bandeau par annonce
 * (ordre serveur). Chaque bandeau est fermable ; la fermeture est mémorisée par `id`
 * dans localStorage (ne réapparaît pas à chaque navigation).
 */
export default function AnnonceBanner({ annonces }: { annonces: Annonce[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setDismissed(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  // Avant montage : rendu identique au serveur (toutes les annonces) pour éviter tout
  // mismatch d'hydratation ; le filtrage localStorage s'applique après hydratation.
  const visibles = mounted ? annonces.filter((a) => !dismissed.includes(a.id)) : annonces
  if (visibles.length === 0) return null

  return (
    <div>
      {visibles.map((a) => {
        const cls = VARIANTS[a.variante ?? 'info'] ?? VARIANTS.info
        return (
          <div key={a.id} className={`${cls} px-4 py-2.5`}>
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="font-semibold">{a.titre}</span>
                {a.contenu && (
                  <span
                    className="opacity-90 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.contenu) }}
                  />
                )}
              </div>
              {a.cta_label && a.cta_url && (
                <Link
                  href={a.cta_url}
                  className="shrink-0 inline-flex items-center rounded-button bg-white/20 hover:bg-white/30 px-3 py-1 text-sm font-semibold transition-colors"
                >
                  {a.cta_label}
                </Link>
              )}
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Fermer l'annonce"
                className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
