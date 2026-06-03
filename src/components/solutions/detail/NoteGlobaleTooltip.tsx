'use client'

import { useState, useRef } from 'react'
import { Info } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { sanitizeHtml } from '@/lib/sanitize'
import type { NoteGlobaleTooltip as NoteGlobaleTooltipData } from '@/lib/db/tooltips'

interface Props {
  data: NoteGlobaleTooltipData
  isLegacy: boolean
}

/**
 * Remplace les espaces normaux par des espaces insécables dans « 100 000 Médecins »
 * (et variantes : « 100 000 médecins », « 100000 médecins » avec espace fin manquante).
 * Filet de sécurité contre les césures involontaires au milieu du nom de la plateforme.
 * Les textes saisis correctement dans l'admin contiennent déjà les insécables — cette
 * fonction ne fait rien dans ce cas.
 */
function nbspMarque(text: string): string {
  return text.replace(/100[\s ]?000[\s ]?(M|m)édecins/g, '100 000 $1édecins')
}

/**
 * Icône info à côté de la note globale.
 * Survol → popover (positionné EN DESSOUS pour éviter de sortir du viewport quand
 *           la note est tout en haut de page).
 * Clic → modale détaillée avec corps HTML sanitizé.
 *
 * Le popover gère un petit délai (180 ms) avant fermeture quand la souris
 * quitte l'icône, pour laisser le temps de naviguer vers le bouton « En savoir
 * plus » sans que le popover disparaisse prématurément.
 */
export default function NoteGlobaleTooltip({ data, isLegacy }: Props) {
  const [hoverOpen, setHoverOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const modaleActive = data.modale_active !== false
  const textCourt = nbspMarque(isLegacy ? data.tooltip_court_legacy : data.tooltip_court_standard)
  const corpsHtml = nbspMarque(sanitizeHtml(data.tooltip_long_corps))

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setHoverOpen(true)
  }
  const handleLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setHoverOpen(false), 180)
  }
  // Clic sur l'icône :
  //  - modale active : ouvre la modale détaillée
  //  - modale désactivée : toggle le popover (utile sur mobile où il n'y a pas de hover)
  const handleIconClick = () => {
    if (modaleActive) {
      setModalOpen(true)
    } else {
      setHoverOpen((v) => !v)
    }
  }

  return (
    <>
      <span
        className="relative inline-flex items-center align-middle"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <button
          type="button"
          onClick={handleIconClick}
          onFocus={handleEnter}
          onBlur={handleLeave}
          aria-label={modaleActive
            ? 'En savoir plus sur le calcul de la note globale'
            : 'Afficher l\'information sur la note globale'}
          className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-navy focus:text-navy transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
        >
          <Info className="w-4 h-4" />
        </button>

        {hoverOpen && (
          <div
            role="tooltip"
            className="
              absolute left-1/2 -translate-x-1/2 top-full mt-2
              w-72 max-w-[80vw] z-30
              rounded-card bg-navy text-white text-xs leading-relaxed text-left shadow-card
              normal-case tracking-normal font-normal
            "
          >
            {/* Petite flèche */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-navy rotate-45" aria-hidden="true" />
            <div className="relative p-3">
              <p>{textCourt}</p>
              {modaleActive && (
                <button
                  type="button"
                  onClick={() => {
                    setHoverOpen(false)
                    setModalOpen(true)
                  }}
                  className="mt-2 text-[11px] text-accent-blue hover:text-white underline underline-offset-2 transition-colors"
                >
                  En savoir plus →
                </button>
              )}
            </div>
          </div>
        )}
      </span>

      {/*
        className `normal-case tracking-normal font-medium` indispensable :
        ce composant est rendu à l'intérieur du <p> "NOTES DES UTILISATEURS"
        (uppercase tracking-widest font-medium), et le Modal n'utilise pas de
        React Portal — il hérite donc des classes typo du parent. On les
        neutralise explicitement ici sinon toute la modale s'affiche en MAJUSCULES.
      */}
      {modaleActive && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          size="lg"
          className="normal-case tracking-normal text-left font-medium"
        >
          <Modal.Header onClose={() => setModalOpen(false)}>{data.tooltip_long_titre}</Modal.Header>
          <Modal.Body>
            <div
              className="
                text-[15px] text-gray-700 text-left leading-relaxed font-normal
                [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                [&_strong]:text-navy [&_strong]:font-semibold
                [&_em]:text-gray-600
                [&_a]:text-accent-blue [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-navy
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ul]:space-y-1
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_ol]:space-y-1
              "
              dangerouslySetInnerHTML={{ __html: corpsHtml }}
            />
          </Modal.Body>
        </Modal>
      )}
    </>
  )
}
