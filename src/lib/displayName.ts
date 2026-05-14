interface DisplayNameInput {
  pseudo?: string | null
  prenom?: string | null
  nom?: string | null
}

/**
 * Nom affiché publiquement pour un utilisateur sur ses avis.
 * Priorité : pseudo renseigné → "Prénom N." → "Anonyme" (cas sans prénom,
 * ex. évaluation anonyme avant complétion de profil).
 */
export function getDisplayName(user: DisplayNameInput | null | undefined): string {
  if (!user) return 'Anonyme'

  const pseudo = user.pseudo?.trim()
  if (pseudo) return pseudo

  const prenom = user.prenom?.trim()
  if (prenom) {
    const initiale = user.nom?.trim()?.charAt(0)
    return initiale ? `${prenom} ${initiale.toUpperCase()}.` : prenom
  }

  return 'Anonyme'
}
