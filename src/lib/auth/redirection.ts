// Adresse de retour après connexion (`?redirect=`, `?next=`) : acceptée seulement si elle reste sur
// le site. Sans ce contrôle, un lien piégé renvoyait après connexion vers un autre site
// (`//autre-site`, `/\autre-site`, `.autre-site` collé au domaine) ou exécutait du code
// (`javascript:`) avec la session de l'utilisateur.

const BASE = 'https://site.invalid'

/** Chemin interne normalisé (`/chemin?requete#ancre`), ou `repli` si la valeur sort du site. */
export function cheminInterne(valeur: string | null | undefined, repli: string): string {
  if (!valeur || !valeur.startsWith('/')) return repli
  try {
    // Le navigateur lit `/\` comme `//` et retire tabulations et retours à la ligne : on laisse
    // l'analyseur d'URL trancher, et on refuse tout ce qui change d'origine.
    const url = new URL(valeur, BASE)
    if (url.origin !== BASE) return repli
    return url.pathname + url.search + url.hash
  } catch {
    return repli
  }
}
