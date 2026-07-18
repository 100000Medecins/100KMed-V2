export type Gagnant = {
  rang: number
  nom: string
  prix: string
  ville?: string
}

/** Métadonnées du jeu concours — à mettre à jour à chaque édition. */
export const JEU_CONCOURS = {
  titre: 'Jeu concours 100 000 Médecins',
  sousTitre: 'Les gagnants',
  intro:
    'Merci aux nombreux médecins qui ont participé ! Voici les gagnants tirés au sort parmi les participants.',
  dateTirage: 'À compléter',
}

/**
 * Liste des gagnants — codée en dur (page sur-mesure, mise à jour = redéploiement).
 * ⚠️ Remplacer les placeholders ci-dessous par les vrais gagnants.
 * `rang` 1/2/3 = podium ; au-delà = liste « Autres gagnants ».
 */
export const GAGNANTS: Gagnant[] = [
  { rang: 1, nom: 'À compléter', prix: 'À compléter' },
  { rang: 2, nom: 'À compléter', prix: 'À compléter' },
  { rang: 3, nom: 'À compléter', prix: 'À compléter' },
]
