/**
 * Normalise une URL externe (saisie par un éditeur/admin) avant de l'afficher en lien.
 *
 * Si le protocole est absent (ex. "www.weda.fr", "cgm.com/fr"), préfixe "https://".
 * Laisse tel quel une URL déjà en http(s):// ou un mailto:/tel:. Renvoie null si vide.
 *
 * Pourquoi : sans ça, `<a href="www.weda.fr">` est interprété comme un lien RELATIF
 * par le navigateur et Googlebot → 404 du type /solutions/<cat>/www.weda.fr
 * (cf. audit SEO 2026-07-19 : 13 fiches solutions concernées).
 */
export function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
