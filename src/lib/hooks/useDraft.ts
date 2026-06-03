'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Autosave d'un formulaire dans le localStorage.
 *
 * - Sauvegarde toutes les `intervalMs` (défaut 30s) si les valeurs ont changé.
 * - Sauvegarde aussi sur `beforeunload` (fermeture/refresh).
 * - Expose `getDraft()` pour lire un brouillon existant (typiquement au montage).
 * - Expose `clearDraft()` pour effacer après sauvegarde serveur réussie.
 * - Expose `lastSavedAt` pour afficher un indicateur dans l'UI.
 *
 * Usage type :
 *   const { getDraft, clearDraft, lastSavedAt } = useDraft({
 *     key: `draft:pages_statiques:${page.id}`,
 *     values: { titre, contenu, meta_description, image_couverture },
 *   })
 *   // Au montage : if (getDraft()) afficher bannière de restauration
 *   // Après save réussie : clearDraft()
 */
export interface DraftStored<V> {
  values: V
  savedAt: number // epoch ms
}

interface UseDraftOptions<V extends Record<string, unknown>> {
  key: string
  values: V
  intervalMs?: number
  /** Désactive l'autosave (ex. pendant un submit en cours). */
  enabled?: boolean
}

export function useDraft<V extends Record<string, unknown>>({
  key,
  values,
  intervalMs = 30_000,
  enabled = true,
}: UseDraftOptions<V>) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const valuesRef = useRef(values)
  // Garde la dernière sérialisation pour détecter "rien à sauver"
  const lastSerializedRef = useRef<string | null>(null)
  const keyRef = useRef(key)

  // Garder les refs à jour à chaque render
  useEffect(() => {
    valuesRef.current = values
    keyRef.current = key
  })

  const saveNow = useCallback(() => {
    if (!enabled) return
    try {
      const serialized = JSON.stringify(valuesRef.current)
      if (serialized === lastSerializedRef.current) return // pas de changement
      const payload: DraftStored<V> = {
        values: valuesRef.current,
        savedAt: Date.now(),
      }
      window.localStorage.setItem(keyRef.current, JSON.stringify(payload))
      lastSerializedRef.current = serialized
      setLastSavedAt(payload.savedAt)
    } catch {
      // localStorage plein / désactivé / SecurityError → on tait, c'est best effort
    }
  }, [enabled])

  // Sauvegarde périodique
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(saveNow, intervalMs)
    return () => window.clearInterval(id)
  }, [enabled, intervalMs, saveNow])

  // Sauvegarde au beforeunload
  useEffect(() => {
    if (!enabled) return
    const handler = () => saveNow()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled, saveNow])

  const getDraft = useCallback((): DraftStored<V> | null => {
    try {
      const raw = window.localStorage.getItem(keyRef.current)
      if (!raw) return null
      const parsed = JSON.parse(raw) as DraftStored<V>
      if (!parsed?.values || typeof parsed.savedAt !== 'number') return null
      return parsed
    } catch {
      return null
    }
  }, [])

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(keyRef.current)
      lastSerializedRef.current = null
      setLastSavedAt(null)
    } catch {
      /* noop */
    }
  }, [])

  return { getDraft, clearDraft, saveNow, lastSavedAt }
}
