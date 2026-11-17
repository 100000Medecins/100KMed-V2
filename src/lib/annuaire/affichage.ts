/**
 * Annuaire — nom et qualité d'une fiche dans la recherche, la carte et la fiche d'un confrère.
 * Depuis le 17/11, une fiche peut venir d'un autre professionnel de santé (publiée depuis
 * l'application) : sa profession s'affiche là où celle d'un médecin montre sa spécialité.
 */

import { SM_SPECIALITES } from '@/lib/constants/profil'
import { estMedecin, libelleProfession, professionDe } from '@/lib/constants/annuaire'

type Personne = { prenom: string | null; nom: string | null; code_profession: string | null }
type Qualite = { specialite: string | null; specialite_code: string | null; code_profession: string | null }

/** Professions qui portent le titre de docteur (décision de David, 17/11) : médecin, pharmacien, chirurgien-dentiste. */
const PROFESSIONS_DOCTEUR = ['10', '21', '40']

/** « Dr Prénom Nom » pour un médecin, un pharmacien ou un dentiste ; « Prénom Nom » sinon. */
export function nomAffiche(p: Personne): string {
  const nom = [p.prenom, p.nom].filter(Boolean).join(' ')
  return PROFESSIONS_DOCTEUR.includes(professionDe(p.code_profession)) ? `Dr ${nom}` : nom
}

/** Spécialité d'un médecin (libellé du site si le code est connu, sinon celui de l'ANS), profession sinon. */
export function qualiteAffichee(q: Qualite): string | null {
  if (!estMedecin(q.code_profession)) return libelleProfession(q.code_profession)
  return (q.specialite_code && SM_SPECIALITES[q.specialite_code]) || q.specialite
}
