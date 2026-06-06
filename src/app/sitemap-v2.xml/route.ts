/**
 * Sitemap alternatif sous une URL différente.
 *
 * Contexte (2026-06-07) : Google Search Console garde un état d'erreur
 * « Impossible de récupérer le sitemap » collant sur /sitemap.xml depuis le
 * 27/05, alors que le fichier est techniquement parfait (HTTP 200, XML valide,
 * 137 URLs, 26 KB, < 0.3s). Les pages du site sont bien indexées par crawl
 * direct (cf Search Console > Pages indexées), donc le sitemap n'est pas
 * bloquant pour le SEO, juste cosmétique.
 *
 * Ce 2e sitemap, à soumettre dans Search Console à côté du /sitemap.xml,
 * sert à forcer Google à re-créer un état "neuf" et casser son cache négatif.
 *
 * Renvoie EXACTEMENT le même contenu que /sitemap.xml (même fonction de génération).
 *
 * Une fois Google ayant validé /sitemap-v2.xml, on peut soit le supprimer
 * (et garder /sitemap.xml officiel), soit le laisser en doublon.
 */

import sitemapGenerator from '../sitemap'

export const dynamic = 'force-dynamic'

export async function GET() {
  const urls = await sitemapGenerator()

  // Sérialiser au format XML sitemap (le même que ce que Next.js produit pour sitemap.ts)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lastmod = u.lastModified
      ? `<lastmod>${typeof u.lastModified === 'string' ? u.lastModified : u.lastModified.toISOString()}</lastmod>`
      : ''
    const changefreq = u.changeFrequency ? `<changefreq>${u.changeFrequency}</changefreq>` : ''
    const priority = u.priority != null ? `<priority>${u.priority}</priority>` : ''
    return `<url><loc>${u.url}</loc>${lastmod}${changefreq}${priority}</url>`
  })
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
