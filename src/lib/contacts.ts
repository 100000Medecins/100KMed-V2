import type { ContactLigne } from '@/types/models'

/**
 * Normalise/valide une liste de contacts (commercial ou support) :
 * - trim de chaque champ,
 * - `''` → `null`,
 * - suppression des lignes entièrement vides (ni libellé, ni email, ni téléphone).
 *
 * Accepte n'importe quelle valeur brute (colonne JSONB `Json`, JSON parsé d'un
 * champ de formulaire, etc.) et renvoie toujours un tableau propre.
 */
export function normalizeContacts(value: unknown): ContactLigne[] {
  const arr: unknown[] = Array.isArray(value) ? value : []
  return arr
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && !Array.isArray(c))
    .map((c) => ({
      libelle: cleanField(c.libelle),
      email: cleanField(c.email),
      telephone: cleanField(c.telephone),
    }))
    .filter((c) => c.libelle || c.email || c.telephone)
}

function cleanField(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Premier contact renseigné (email ou téléphone) d'une liste, ou null. */
export function firstContact(value: unknown): ContactLigne | null {
  const list = normalizeContacts(value)
  return list.find((c) => c.email || c.telephone) ?? null
}
