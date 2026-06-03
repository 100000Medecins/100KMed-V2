export type PrixFrequence = 'mois' | 'an' | 'unique' | null

export interface PrixInput {
  prix_ttc: number | null
  prix_ttc_min: number | null
  prix_ttc_max: number | null
  prix_devise: string | null
  prix_frequence: string | null
  prix_duree_engagement_mois: number | null
}

export type PrixTier = 1 | 2 | 3 | 4

export interface PrixDisplay {
  hasPrice: boolean
  isRange: boolean
  /** Valeur numerique utilisee pour le tri et le calcul du tier (mediane si plage, sinon prix_ttc) */
  sortValue: number | null
  /** Texte principal : "89 €/mois TTC" ou "49 – 199 €/mois TTC" */
  label: string | null
  /** Sous-texte : "Engagement 12 mois" (vide si pas d'engagement) */
  engagementLabel: string | null
  /** Devise sous forme de symbole : € / $ / £ */
  symbol: string
}

const DEVISE_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

/**
 * Normalise la devise : accepte aussi bien le code ISO ('EUR') que le symbole ('€')
 * stocké historiquement en BDD. Retourne le symbole d'affichage.
 */
function symbolFor(devise: string | null): string {
  if (!devise) return '€'
  // Cas où le symbole est déjà en BDD (historique Firebase) : on le renvoie tel quel
  if (devise === '€' || devise === '$' || devise === '£') return devise
  return DEVISE_SYMBOLS[devise] ?? '€'
}

/**
 * Normalise un montant : 0 ou négatif = donnée parasite (héritage Firebase) → null.
 * Un prix de 0 € n'a pas de sens commercial pour un logiciel médical : c'est
 * indiscernable d'un "non renseigné".
 */
function normalizePrice(v: number | null): number | null {
  if (v == null) return null
  if (v <= 0) return null
  return v
}

function frequenceLabel(f: string | null): string {
  if (f === 'mois') return '/mois'
  if (f === 'an') return '/an'
  if (f === 'unique') return ''
  return ''
}

function formatAmount(n: number, devise: string | null): string {
  const symbol = symbolFor(devise)
  const rounded = Number.isInteger(n) ? n : Math.round(n * 100) / 100
  const formatted = rounded.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${symbol}`
}

/**
 * Normalise un PrixInput : remplace les 0/négatifs par null (donnée parasite).
 * Toutes les fonctions exportées de ce module passent par cette normalisation
 * en entrée pour rester robustes face aux résidus de l'import Firebase.
 */
function normalize(p: PrixInput): PrixInput {
  return {
    ...p,
    prix_ttc: normalizePrice(p.prix_ttc),
    prix_ttc_min: normalizePrice(p.prix_ttc_min),
    prix_ttc_max: normalizePrice(p.prix_ttc_max),
  }
}

/**
 * Calcule la valeur de tri d'une solution :
 * - prix unique → prix_ttc
 * - plage → mediane (min + max) / 2 (decision cadree 2026-06-03)
 * - sinon null
 */
export function computeSortValue(input: PrixInput): number | null {
  const p = normalize(input)
  if (p.prix_ttc != null) return p.prix_ttc
  if (p.prix_ttc_min != null && p.prix_ttc_max != null) {
    return (p.prix_ttc_min + p.prix_ttc_max) / 2
  }
  if (p.prix_ttc_min != null) return p.prix_ttc_min
  if (p.prix_ttc_max != null) return p.prix_ttc_max
  return null
}

/**
 * Construit la representation prete a afficher d'un prix solution.
 * Retourne hasPrice=false si rien n'est renseigne (le composant affichera "Prix sur demande").
 */
export function buildPrixDisplay(input: PrixInput): PrixDisplay {
  const p = normalize(input)
  const symbol = symbolFor(p.prix_devise)
  const freqLabel = frequenceLabel(p.prix_frequence)
  const ttcSuffix = ' TTC'

  const isRange = p.prix_ttc == null && (p.prix_ttc_min != null || p.prix_ttc_max != null)
  const hasPrice = p.prix_ttc != null || p.prix_ttc_min != null || p.prix_ttc_max != null

  let label: string | null = null
  if (p.prix_ttc != null) {
    label = `À partir de ${formatAmount(p.prix_ttc, p.prix_devise)}${freqLabel}${ttcSuffix}`
  } else if (p.prix_ttc_min != null && p.prix_ttc_max != null) {
    const min = p.prix_ttc_min.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    const max = p.prix_ttc_max.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    label = `Entre ${min} et ${max} ${symbol}${freqLabel}${ttcSuffix}`
  } else if (p.prix_ttc_min != null) {
    label = `À partir de ${formatAmount(p.prix_ttc_min, p.prix_devise)}${freqLabel}${ttcSuffix}`
  } else if (p.prix_ttc_max != null) {
    label = `Jusqu'à ${formatAmount(p.prix_ttc_max, p.prix_devise)}${freqLabel}${ttcSuffix}`
  }

  let engagementLabel: string | null = null
  if (p.prix_duree_engagement_mois && p.prix_duree_engagement_mois > 0) {
    engagementLabel = `Engagement ${p.prix_duree_engagement_mois} mois`
  }

  return {
    hasPrice,
    isRange,
    sortValue: computeSortValue(p),
    label,
    engagementLabel,
    symbol,
  }
}

/**
 * Format compact pour le listing comparatif : "89 €/mois" ou "49–199 €/mois"
 * (sans suffixe TTC ni "À partir de" pour rester court sur les cartes)
 */
export function formatPrixCompact(input: PrixInput): string | null {
  const p = normalize(input)
  const symbol = symbolFor(p.prix_devise)
  const freqLabel = frequenceLabel(p.prix_frequence)
  if (p.prix_ttc != null) {
    return `${formatAmount(p.prix_ttc, p.prix_devise)}${freqLabel}`
  }
  if (p.prix_ttc_min != null && p.prix_ttc_max != null) {
    const min = p.prix_ttc_min.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    const max = p.prix_ttc_max.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    return `${min}–${max} ${symbol}${freqLabel}`
  }
  if (p.prix_ttc_min != null) return `≥ ${formatAmount(p.prix_ttc_min, p.prix_devise)}${freqLabel}`
  if (p.prix_ttc_max != null) return `≤ ${formatAmount(p.prix_ttc_max, p.prix_devise)}${freqLabel}`
  return null
}

/**
 * Calcule la mediane des prix renseignes d'une categorie.
 * Utilise sortValue (donc mediane de plage pour les solutions en plage) pour rester coherent.
 * Retourne null si moins de 2 solutions ont un prix (mediane non significative).
 */
export function computeCategoryMedian(solutions: PrixInput[]): number | null {
  const values = solutions
    .map(computeSortValue)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b)

  if (values.length < 2) return null

  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid]
}

/**
 * Renvoie le tier d'une solution vs la mediane de sa categorie :
 * 1 = €     (< 50% de la mediane)
 * 2 = €€    (50–100% de la mediane)
 * 3 = €€€   (100–200% de la mediane)
 * 4 = €€€€  (> 200% de la mediane)
 *
 * Retourne null si la solution n'a pas de prix ou si la mediane n'est pas calculable.
 */
export function computePriceTier(input: PrixInput, median: number | null): PrixTier | null {
  const v = computeSortValue(input)
  if (v == null || median == null || median <= 0) return null
  const ratio = v / median
  if (ratio < 0.5) return 1
  if (ratio < 1) return 2
  if (ratio < 2) return 3
  return 4
}

/**
 * Rendu textuel du tier ("€", "€€", "€€€", "€€€€")
 */
export function tierString(tier: PrixTier): string {
  return '€'.repeat(tier)
}
