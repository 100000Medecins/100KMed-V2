/**
 * Modale de prévisualisation des changements avant sauvegarde.
 *
 * Diff inline mot par mot (diffWordsWithSpace) : le texte s'affiche dans son
 * flux normal, seuls les mots ajoutés (vert) et supprimés (rouge barré) sont
 * surlignés. Beaucoup plus lisible que diffLines pour de la prose / HTML
 * éditorial où une ligne peut être longue et changer sur quelques mots.
 *
 * Mis en place après l'écrasement de pages_statiques.contenu slug=transparence
 * le 2026-05-29 (~1600 caractères perdus silencieusement).
 *
 * Complète le versioning (table pages_statiques_history, autosave) en
 * agissant en amont de la sauvegarde plutôt qu'en réparation après coup.
 *
 * Seuil d'affichage : ne s'ouvre que si le nombre de caractères modifiés
 * (somme des ajouts + suppressions) est >= MIN_DIFF_CHARS. En dessous,
 * la sauvegarde se fait directement (= petite correction de typo,
 * pas de friction inutile).
 */
'use client'

import { useMemo } from 'react'
import { diffWordsWithSpace } from 'diff'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

/**
 * Seuil minimal de caractères modifiés pour déclencher la modale.
 * En dessous, la sauvegarde se fait directement.
 */
export const MIN_DIFF_CHARS = 50

interface DiffModalProps {
  open: boolean
  oldContent: string
  newContent: string
  onConfirm: () => void
  onCancel: () => void
  /** Label affiché en titre de la modale (ex. "Confirmer la modification de la page Transparence"). */
  title?: string
  /** Indique si la sauvegarde est en cours (désactive les boutons + spinner). */
  pending?: boolean
}

/**
 * Compte le nombre total de caractères modifiés (ajoutés + supprimés)
 * entre deux contenus. Utilisé pour décider si la modale doit s'ouvrir.
 */
export function countDiffChars(oldContent: string, newContent: string): number {
  if (oldContent === newContent) return 0
  const parts = diffWordsWithSpace(oldContent, newContent)
  let total = 0
  for (const part of parts) {
    if (part.added || part.removed) {
      total += part.value.length
    }
  }
  return total
}

export default function DiffModal({
  open,
  oldContent,
  newContent,
  onConfirm,
  onCancel,
  title = 'Confirmer les modifications',
  pending = false,
}: DiffModalProps) {
  const diffParts = useMemo(() => {
    if (!open) return []
    return diffWordsWithSpace(oldContent, newContent)
  }, [open, oldContent, newContent])

  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    for (const part of diffParts) {
      if (part.added) added += part.value.length
      else if (part.removed) removed += part.value.length
    }
    return { added, removed }
  }, [diffParts])

  return (
    <Modal open={open} onClose={onCancel} size="xl">
      <Modal.Header onClose={onCancel}>{title}</Modal.Header>
      <Modal.Body>
        <div className="mb-4 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            +{stats.added} caractères
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            −{stats.removed} caractères
          </span>
          <span className="text-gray-400">
            Vérifie que les suppressions sont volontaires avant d&apos;enregistrer.
          </span>
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-card border border-gray-200 bg-gray-50 p-4 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-gray-700">
          {diffParts.map((part, i) => {
            if (part.added) {
              return (
                <span
                  key={i}
                  className="bg-green-200/70 text-green-900 rounded px-0.5"
                >
                  {part.value}
                </span>
              )
            }
            if (part.removed) {
              return (
                <span
                  key={i}
                  className="bg-red-200/70 text-red-900 line-through rounded px-0.5"
                >
                  {part.value}
                </span>
              )
            }
            return <span key={i}>{part.value}</span>
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button variant="primary" onClick={onConfirm} loading={pending}>
          Enregistrer les modifications
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
