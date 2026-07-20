export type Gagnant = {
  nom: string
  prix: string
  ville?: string
}

/** Métadonnées du jeu concours — à mettre à jour à chaque édition. */
export const JEU_CONCOURS = {
  titre: 'Jeu concours — WONCA Europe 2026',
  sousTitre: 'Les gagnants',
  intro:
    'Merci aux 56 médecins qui ont évalué une solution sur notre stand pendant la WONCA Europe 2026 à Paris ! ' +
    'Trois d’entre eux ont été tirés au sort — les voici.',
  dateTirage: '3 juillet 2026',
}

/**
 * Gagnants du tirage au sort — codés en dur (page sur-mesure, MAJ = redéploiement).
 * Affichage : prénom + initiale du nom de famille (RGPD). Pas de hiérarchie entre
 * les trois (3 lots distincts, aucun « 1er prix »).
 */
export const GAGNANTS: Gagnant[] = [
  { nom: 'Dr Sarah R.', prix: 'Batterie externe portable' },
  { nom: 'Dr Marion B.', prix: 'Lecteur de carte Vitale 3-en-1' },
  { nom: 'Dr Léticia S.', prix: 'Mini-ECG portable' },
]
