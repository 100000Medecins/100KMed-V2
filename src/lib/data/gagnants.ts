export type Gagnant = {
  nom: string
  prix: string
  ville?: string
  /** URL de la photo du lot (Storage). Vide → icône par défaut. */
  image?: string
}

// Base des visuels du jeu concours sur Supabase Storage.
const IMG = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/jeu-concours/'

/**
 * Contenu du jeu concours — TOUT est éditable ici (page publique /jeu-concours).
 * Il n'y a pas d'admin dédié : on modifie ce fichier puis on redéploie.
 */
export const JEU_CONCOURS = {
  titre: 'Jeu concours — WONCA Europe 2026',
  sousTitre: 'Les gagnants',
  intro:
    'Merci aux 56 médecins qui ont évalué une solution sur notre stand pendant la WONCA Europe 2026 à Paris ! ' +
    'Trois d’entre eux ont été tirés au sort — les voici.',
  dateTirage: '3 juillet 2026',
  /** Affiche du congrès affichée en haut de page (URL Storage). Vide → pas d'affiche. */
  afficheUrl: `${IMG}affiche-wonca-2026.webp`,
  /** Lien vers le règlement (PDF, Storage). */
  reglementUrl:
    'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/reglement-jeu-concours-wonca-2026.pdf',
  /** Texte d'invitation sous les résultats (patienter jusqu'au prochain jeu). */
  conclusion:
    'Vous n’avez pas gagné cette fois-ci ? Ce n’est que partie remise : on remet le couvert au prochain salon ! ' +
    'D’ici là, continuez à partager vos avis sur vos logiciels — c’est ce qui fait vivre la plateforme — et gardez l’œil ouvert pour le prochain jeu concours. 👀',
}

/**
 * Gagnants du tirage au sort. Affichage : prénom + initiale du nom (RGPD).
 * Pas de hiérarchie entre les trois (3 lots distincts, aucun « 1er prix »).
 */
export const GAGNANTS: Gagnant[] = [
  { nom: 'Dr Sarah R.', prix: 'Batterie externe portable', image: `${IMG}batterie.webp` },
  { nom: 'Dr Marion B.', prix: 'Lecteur de carte Vitale 3-en-1', image: `${IMG}lecteur-vitale.webp` },
  { nom: 'Dr Léticia S.', prix: 'Mini-ECG portable', image: `${IMG}ecg.webp` },
]
