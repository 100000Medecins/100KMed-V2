// Labels des critères majeurs selon la catégorie
// Par défaut : "Fonctionnalités"
// Pour les catégories IA : "Utilité"

const SLUGS_UTILITE = ['intelligence-artificielle-medecine', 'ia-documentaires']

export const CRITERE_LABELS_DEFAULT: Record<string, string> = {
  interface: 'Interface utilisateur',
  fonctionnalites: 'Fonctionnalités',
  fiabilite: 'Fiabilité',
  editeur: 'Éditeur / Support',
  qualite_prix: 'Rapport qualité/prix',
}

export const CRITERE_LABELS_IA: Record<string, string> = {
  ...CRITERE_LABELS_DEFAULT,
  fonctionnalites: 'Utilité',
}

export function getCritereLabels(categorieSlug?: string): Record<string, string> {
  if (categorieSlug && SLUGS_UTILITE.includes(categorieSlug)) return CRITERE_LABELS_IA
  return CRITERE_LABELS_DEFAULT
}

export function getCritereLabel(key: string, categorieSlug?: string): string {
  return getCritereLabels(categorieSlug)[key] ?? key
}
