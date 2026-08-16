import { getSitemapEntries } from '@/lib/seo/sitemap-entries'

/**
 * INDEX de sitemap (`<sitemapindex>`), 3e et dernière tentative de déblocage de l'état
 * « Impossible de récupérer le sitemap » qui traîne dans GSC depuis le 2026-05-27.
 *
 * Pourquoi celui-ci diffère des deux précédents : /sitemap.xml et /sitemap-main.xml sont
 * tous deux des `<urlset>`. GSC les classe sous le type « Sitemap ». Un `<sitemapindex>`
 * est un type de document DISTINCT (« Index de sitemap ») — c'est le seul paramètre du
 * problème qui n'ait jamais été changé en 5 tentatives (refonte 29/05, sitemap-v2 07/06,
 * ISR+try/catch 15/06, suppression/re-soumission 09/07, URL neuve 19/07).
 *
 * Diagnostic verrouillé le 2026-08-16 avant d'écrire cette route — le serveur est hors de
 * cause : 65/65 réponses 200 en Googlebot (X-Vercel-Cache HIT, 36-136 ms), XML bien formé
 * sans BOM, 240 URLs identiques entre les deux sitemaps, Content-Type correct, gzip et
 * HTTP/1.1 OK, requête conditionnelle → 304, DNS résolu par le résolveur de Google, ni
 * DNSSEC ni AAAA, TLS valide, apex → www en un seul 308, pare-feu Vercel sans Bot
 * Protection ni règle custom.
 *
 * VALEUR DIAGNOSTIQUE — c'est le vrai intérêt de cette route, quel que soit l'issue :
 * - index lu ✅ mais enfant en échec ❌ → le blocage vise la récupération du `<urlset>`,
 *   et l'index devient le sitemap de référence ;
 * - index également en échec ❌ → le blocage est au niveau de la PROPRIÉTÉ GSC, plus rien
 *   à tenter côté code : clore le sujet définitivement.
 *
 * Rappel de proportion : le sitemap n'a jamais fait découvrir une seule page (« 0 page
 * découverte ») alors que l'index Google est passé de ~50 à 139 pages entre mai et août.
 * Google trouve tout par crawl direct. Ce fichier est un confort, pas une dépendance.
 */
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

/**
 * `lastmod` de l'enfant = date la plus récente du sitemap réel, pour donner un signal de
 * fraîcheur honnête (plutôt qu'un `new Date()` qui bougerait toutes les heures sans raison
 * — Google se méfie à juste titre des lastmod qui changent sans que le contenu change).
 * Repli sur l'heure courante si la BDD hoquette : comme `getSitemapEntries`, cette route
 * ne doit JAMAIS 5xx, sous peine de recréer le symptôme qu'elle cherche à lever.
 */
async function dernierLastmod(): Promise<string> {
  try {
    const entries = await getSitemapEntries()
    const timestamps = entries
      .map((e) => (e.lastModified ? new Date(e.lastModified).getTime() : NaN))
      .filter((t) => Number.isFinite(t))
    if (timestamps.length > 0) return new Date(Math.max(...timestamps)).toISOString()
  } catch {
    // ignoré : repli ci-dessous
  }
  return new Date().toISOString()
}

export async function GET() {
  const lastmod = await dernierLastmod()

  // Pointe sur /sitemap-main.xml (le plus récemment régénéré des deux `<urlset>`), pas sur
  // /sitemap.xml dont l'entrée GSC porte l'historique d'échec le plus lourd.
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap>\n` +
    `    <loc>${BASE_URL}/sitemap-main.xml</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `  </sitemap>\n` +
    `</sitemapindex>\n`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate',
    },
  })
}
