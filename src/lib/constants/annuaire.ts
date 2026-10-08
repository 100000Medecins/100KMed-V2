/**
 * Annuaire mutualisé — constantes partagées (fiche, accords, catalogue).
 * Référence : docs/2026-10-07-annuaire-tranche-1.md
 */

/**
 * Version des textes d'accord ci-dessous, enregistrée avec la date de chaque accord
 * (`fiches_annuaire.publiee_accord_version`, `fiches_annuaire_portables.visible_accord_version`).
 * À changer à chaque modification de ces textes, et le jour où les CGU de l'annuaire sont publiées :
 * un accord donné sous une autre version reste daté de son jour, le nouveau prend la date du jour.
 */
export const ANNUAIRE_VERSION_ACCORD = '2026-10-07'

export const TEXTE_ACCORD_PUBLICATION =
  'Je publie ma fiche dans l’annuaire, visible des seuls médecins connectés par Pro Santé Connect.'

export const TEXTE_ACCORD_PORTABLE =
  'Je rends mon portable visible des médecins connectés par Pro Santé Connect, à la demande, fiche par fiche.'

export const MOYENS_CONTACT = [
  { valeur: 'messagerie', libelle: 'Messagerie instantanée (application 100 000 Médecins)' },
  { valeur: 'mssante', libelle: 'Message sécurisé MSSanté' },
  { valeur: 'telephone', libelle: 'Téléphone' },
] as const

export type MoyenContact = (typeof MOYENS_CONTACT)[number]['valeur']

/** Plafond aussi imposé en base (déclencheur `fiches_intitules_limiter`). */
export const MAX_COMPETENCES = 20

/** Propositions d'intitulés en attente de validation, par médecin. */
export const MAX_PROPOSITIONS_EN_ATTENTE = 5

/** Rayons de recherche proposés (km), comme dans l'application ; null = toute la France. */
export const RAYONS_KM = [5, 10, 20, 50] as const
export const RAYON_PAR_DEFAUT_KM = 10

/** Fond de carte Plan IGN (Géoplateforme), le même que l'application. */
export const STYLE_CARTE_PLAN_IGN = 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json'

/**
 * Rubriques du catalogue proposées quand le champ de recherche est vide, selon la
 * spécialité RPPS du médecin (code SM, cf. `SM_SPECIALITES`).
 */
export const RUBRIQUES_PAR_SPECIALITE: Record<string, string[]> = {
  SM26: ['Médecine générale'], SM53: ['Médecine générale'], SM54: ['Médecine générale'],
  SM04: ['Cardiologie et médecine vasculaire'], SM73: ['Cardiologie et médecine vasculaire'],
  SM79: ['Cardiologie et médecine vasculaire'], SM80: ['Cardiologie et médecine vasculaire'],
  SM81: ['Cardiologie et médecine vasculaire'], SM61: ['Cardiologie et médecine vasculaire'],
  SM15: ['Dermatologie et vénéréologie'],
  SM24: ['Gastro-entérologie et hépatologie'],
  SM19: ['Gynécologie, obstétrique et santé des femmes'], SM20: ['Gynécologie, obstétrique et santé des femmes'],
  SM51: ['Gynécologie, obstétrique et santé des femmes'], SM52: ['Gynécologie, obstétrique et santé des femmes'],
  SM40: ['Pédiatrie'], SM87: ['Pédiatrie'], SM88: ['Pédiatrie'], SM89: ['Pédiatrie'], SM90: ['Pédiatrie'],
  SM42: ['Psychiatrie'], SM43: ['Psychiatrie'], SM92: ['Psychiatrie'], SM93: ['Psychiatrie'],
  SM33: ['Psychiatrie', 'Neurologie'],
  SM32: ['Neurologie'], SM84: ['Neurologie'],
  SM41: ['Pneumologie'], SM91: ['Pneumologie'],
  SM48: ['Rhumatologie et appareil locomoteur'],
  SM16: ['Endocrinologie, diabétologie, nutrition'], SM62: ['Endocrinologie, diabétologie, nutrition'],
  SM34: ['ORL, face et cou'], SM39: ['ORL, face et cou'], SM86: ['ORL, face et cou'],
  SM06: ['ORL, face et cou'], SM07: ['ORL, face et cou'], SM68: ['ORL, face et cou'], SM77: ['ORL, face et cou'],
  SM50: ['ORL, face et cou'], SM56: ['ORL, face et cou'],
  SM38: ['Ophtalmologie'], SM85: ['Ophtalmologie'],
  SM12: ['Urologie'],
  SM30: ['Néphrologie'], SM83: ['Néphrologie'],
  SM08: ['Chirurgie orthopédique et traumatologique'], SM70: ['Chirurgie orthopédique et traumatologique'],
  SM05: ['Chirurgie viscérale et autres chirurgies'], SM14: ['Chirurgie viscérale et autres chirurgies'],
  SM78: ['Chirurgie viscérale et autres chirurgies'], SM69: ['Chirurgie viscérale et autres chirurgies'],
  SM09: ['Chirurgie viscérale et autres chirurgies'],
  SM44: ['Radiologie et imagerie'], SM55: ['Radiologie et imagerie'], SM74: ['Radiologie et imagerie'],
  SM94: ['Radiologie et imagerie'], SM28: ['Radiologie et imagerie'],
  SM18: ['Gériatrie'],
  SM29: ['Médecine physique et de réadaptation'],
  SM27: ['Médecine interne et maladies systémiques'], SM72: ['Médecine interne et maladies systémiques'],
  SM21: ['Oncologie et hématologie'], SM22: ['Oncologie et hématologie'], SM23: ['Oncologie et hématologie'],
  SM71: ['Oncologie et hématologie'], SM35: ['Oncologie et hématologie'], SM36: ['Oncologie et hématologie'],
  SM37: ['Oncologie et hématologie'], SM45: ['Oncologie et hématologie'],
  SM02: ['Anesthésie, réanimation et urgences'], SM46: ['Anesthésie, réanimation et urgences'],
  SM59: ['Anesthésie, réanimation et urgences'], SM76: ['Anesthésie, réanimation et urgences'],
  SM82: ['Anesthésie, réanimation et urgences'],
  SM01: ['Anatomie pathologique et biologie'], SM03: ['Anatomie pathologique et biologie'],
  SM63: ['Anatomie pathologique et biologie'], SM64: ['Anatomie pathologique et biologie'],
  SM65: ['Anatomie pathologique et biologie'], SM66: ['Anatomie pathologique et biologie'],
  SM67: ['Anatomie pathologique et biologie'],
  SM31: ['Neurochirurgie'],
  SM10: ['Chirurgie plastique, reconstructrice et esthétique'],
  SM11: ['Chirurgie vasculaire, cardiaque et thoracique'], SM13: ['Chirurgie vasculaire, cardiaque et thoracique'],
  SM17: ['Pratiques transversales'], SM25: ['Pratiques transversales'], SM47: ['Pratiques transversales'],
  SM49: ['Pratiques transversales'], SM57: ['Pratiques transversales'], SM58: ['Pratiques transversales'],
  SM60: ['Pratiques transversales'], SM75: ['Pratiques transversales'], SM95: ['Pratiques transversales'],
}
