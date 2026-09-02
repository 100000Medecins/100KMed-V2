/**
 * Durée d'utilisation déclarée par le médecin — lecture des réponses du questionnaire.
 *
 * Module à part (et non dans `lib/actions/evaluation.ts`) : ce fichier est `'use server'`,
 * donc tous ses exports doivent être des fonctions async — un helper synchrone y casse le build.
 */

/**
 * Dates d'utilisation déclarées dans le questionnaire, stockées dans `evaluations.scores`.
 * Le flux anonyme n'a pas encore d'utilisateur au moment de la saisie : `scores` est donc
 * le seul endroit où ces réponses existent tant que l'éval n'est pas rattachée.
 */
export function datesUtilisationDeclarees(scores: unknown): { dateDebut: string | null; dateFin: string | null } {
  const s = (scores ?? {}) as Record<string, unknown>
  return {
    dateDebut: typeof s.date_debut === 'string' ? s.date_debut : null,
    dateFin: typeof s.date_fin === 'string' ? s.date_fin : null,
  }
}

/**
 * Durée d'utilisation **déclarée** par le médecin, telle qu'il l'a saisie au moment
 * de son évaluation. Volontairement figée à la date de l'avis : la durée est une
 * déclaration datée, pas un compteur — sinon un « 5 ans » de 2026 devient « 6 ans »
 * en 2027 alors que le médecin n'a rien redit (et a peut-être changé de logiciel).
 *
 * Deux sources déclaratives, dans cet ordre :
 *  1. `scores.date_debut` — questionnaire actuel (« Depuis combien d'années… »,
 *     stocké `AAAA-01-01` : seule l'année est saisie, d'où une granularité en années).
 *  2. `evaluations.temps_precedente_solution` — questionnaire Firebase historique.
 *     ⚠️ Nom trompeur : la colonne porte bien la durée d'usage **de la solution notée**
 *     (années : '1', '2', '3', '3+' ; '-1' = question non répondue). Vérifié le
 *     2026-09-02 : `solutions_utilisees.solution_precedente_id` n'a jamais été rempli
 *     (0 ligne), et les évals portant les deux signaux concordent.
 *
 * Rien de déclaré → `null` → aucune mention affichée. `solutions_utilisees.date_debut`
 * n'est **pas** une troisième source : c'est un champ de cycle de vie initialisé à la
 * date de l'évaluation, donc l'utiliser affichait l'âge de l'avis déguisé en durée
 * d'utilisation (bug corrigé le 2026-09-02).
 */
export function dureeDeclaree(
  dateDebutDeclaree: string | null,
  dateFin: string | null,
  tempsPrecedenteSolution: string | null,
  dateAvis: string | null
): { annees: number; auMoins: boolean } | null {
  if (dateDebutDeclaree) {
    const debut = new Date(dateDebutDeclaree)
    const ref = dateFin ? new Date(dateFin) : dateAvis ? new Date(dateAvis) : null
    if (ref && !isNaN(debut.getTime()) && !isNaN(ref.getTime())) {
      return { annees: Math.max(0, ref.getFullYear() - debut.getFullYear()), auMoins: false }
    }
  }
  const tps = tempsPrecedenteSolution
  if (tps && tps !== '-1') {
    if (tps === '3+') return { annees: 3, auMoins: true }
    const n = parseInt(tps, 10)
    if (!isNaN(n) && n > 0) return { annees: n, auMoins: false }
  }
  return null
}
