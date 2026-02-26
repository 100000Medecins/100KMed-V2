export const SPECIALITES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Endocrinologie',
  'Gastro-entérologie',
  'Gériatrie',
  'Gynécologie',
  'Hématologie',
  'Infectiologie',
  'Médecine du travail',
  'Médecine physique',
  'Néphrologie',
  'Neurologie',
  'Oncologie',
  'Ophtalmologie',
  'ORL',
  'Pédiatrie',
  'Pneumologie',
  'Psychiatrie',
  'Radiologie',
  'Rhumatologie',
  'Urologie',
  'Chirurgie générale',
  'Chirurgie orthopédique',
  'Anesthésie-réanimation',
  "Médecine d'urgence",
  'Autre',
]

export const MODES_EXERCICE = [
  'Libéral',
  'Salarié',
  'Mixte',
  'Hospitalier',
  'Remplaçant',
]

export const AVATARS = Array.from({ length: 48 }, (_, i) => ({
  id: `avatar-${i + 1}`,
  url: `/images/portraits/avatar-${i + 1}.png`,
}))
