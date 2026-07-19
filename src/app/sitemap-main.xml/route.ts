import { getSitemapEntries } from '@/lib/seo/sitemap-entries'

/**
 * Sitemap ALTERNATIF servi à une URL NEUVE (/sitemap-main.xml), avec exactement le même
 * contenu que /sitemap.xml. But : repartir sur une entité Search Console vierge, car
 * l'entrée /sitemap.xml est bloquée depuis > 2 mois sur « Impossible de récupérer » (état
 * collant GSC, alors que le fichier est parfaitement servi — vérifié en Googlebot le
 * 2026-07-19). Cf docs/2026-07-19-audit-seo-indexation-gsc.md.
 *
 * À soumettre dans GSC à la place (ou en plus) de /sitemap.xml.
 */
export const revalidate = 3600

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const entries = await getSitemapEntries()

  const body = entries
    .map((e) => {
      const loc = esc(String(e.url))
      const lastmod =
        e.lastModified instanceof Date
          ? e.lastModified.toISOString()
          : e.lastModified
            ? new Date(e.lastModified).toISOString()
            : null
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        e.changeFrequency ? `    <changefreq>${e.changeFrequency}</changefreq>` : null,
        typeof e.priority === 'number' ? `    <priority>${e.priority}</priority>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate',
    },
  })
}
