export const CRITERE_LABELS_DEFAULT: Record<string, string> = {
  interface: 'Interface utilisateur',
  fonctionnalites: 'Fonctionnalités',
  fiabilite: 'Fiabilité',
  editeur: 'Éditeur / Support',
  qualite_prix: 'Rapport qualité/prix',
}

export function getCritereLabels(labelFonctionnalites?: string | null): Record<string, string> {
  if (!labelFonctionnalites) return CRITERE_LABELS_DEFAULT
  return { ...CRITERE_LABELS_DEFAULT, fonctionnalites: labelFonctionnalites }
}

export function getCritereLabel(key: string, labelFonctionnalites?: string | null): string {
  return getCritereLabels(labelFonctionnalites)[key] ?? key
}
