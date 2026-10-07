import { SM_SPECIALITES } from '@/lib/constants/profil'

/** Texte comparable pour la recherche : minuscules, sans accents ni ponctuation. */
export function normaliserRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’\-/(),.;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Intitulé proposé par un médecin : espaces normalisés, majuscule initiale. */
export function normaliserLibelle(texte: string): string {
  const t = texte.replace(/\s+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Mobiles d'outre-mer : préfixe national → indicatif (le reste des 06/07 est en +33)
const MOBILES_OUTRE_MER: [string, string][] = [
  ['0690', '590'], ['0691', '590'], // Guadeloupe, Saint-Martin, Saint-Barthélemy
  ['0694', '594'], // Guyane
  ['0696', '596'], ['0697', '596'], // Martinique
  ['0692', '262'], ['0693', '262'], ['0639', '262'], // La Réunion, Mayotte
]

/**
 * Portable saisi → format international (+33612345678). `null` si non reconnu.
 * Accepte un mobile français (06/07, outre-mer compris) ou un numéro international (+…, 00…).
 */
export function normaliserPortable(saisie: string): string | null {
  let n = saisie.replace(/[\s.\-()]/g, '')
  if (n.startsWith('00')) n = '+' + n.slice(2)
  if (/^0[67]\d{8}$/.test(n)) {
    const outreMer = MOBILES_OUTRE_MER.find(([prefixe]) => n.startsWith(prefixe))
    return outreMer ? `+${outreMer[1]}${n.slice(1)}` : `+33${n.slice(1)}`
  }
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null
}

/** Portable au format international → saisie lisible (06 12 34 56 78 pour la métropole). */
export function afficherPortable(e164: string | null | undefined): string {
  if (!e164) return ''
  if (/^\+33[67]\d{8}$/.test(e164)) {
    return ('0' + e164.slice(3)).replace(/(\d{2})(?=\d)/g, '$1 ')
  }
  return e164
}

/** Codes SM correspondant à une spécialité enregistrée en libellé (`users.specialite`). */
export function codesSmDeSpecialite(libelle: string | null | undefined): string[] {
  if (!libelle) return []
  const cible = normaliserRecherche(libelle)
  return Object.entries(SM_SPECIALITES)
    .filter(([, l]) => normaliserRecherche(l) === cible)
    .map(([code]) => code)
}
