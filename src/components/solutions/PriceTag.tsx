import { formatPrixCompact, tierString, type PrixInput, type PrixTier } from '@/lib/prix'

interface PriceTagProps {
  prix: PrixInput
  tier: PrixTier | null
  /** Valeur de la mediane (pour la tooltip "median categorie : 120 €/mois") */
  categoryMedian?: number | null
  /** Style compact pour les cartes (defaut true) */
  compact?: boolean
}

const TIER_COLORS: Record<PrixTier, string> = {
  1: 'text-green-600',   // bon marche
  2: 'text-amber-500',
  3: 'text-orange-500',
  4: 'text-red-500',     // premium
}

export default function PriceTag({ prix, tier, categoryMedian, compact = true }: PriceTagProps) {
  const compactLabel = formatPrixCompact(prix)
  if (!compactLabel) return null

  const tooltip = categoryMedian != null
    ? `${compactLabel} — médiane de la catégorie : ${categoryMedian.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
    : compactLabel

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-navy`}
    >
      <span className="whitespace-nowrap">{compactLabel}</span>
      {tier != null && (
        <span className={`font-bold ${TIER_COLORS[tier]}`} aria-label={`Niveau de prix ${tier} sur 4`}>
          {tierString(tier)}
        </span>
      )}
    </span>
  )
}
