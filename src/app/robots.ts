import { MetadataRoute } from 'next'

/**
 * Force-dynamic : on a besoin de lire VERCEL_ENV/VERCEL_URL au runtime, pas au build.
 * Sinon Next.js fige le robots.txt au build de prod et tous les déploiements (prod,
 * preview, dev) servent le même fichier — ce qui ouvrait l'indexation de
 * dev.100000medecins.org constatée le 2026-06-07.
 */
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Bloquer toute indexation sur les environnements non-prod (preview, dev, etc.)
  // Couvre dev.100000medecins.org (où VERCEL_ENV=preview) ET les URLs preview Vercel
  // automatiques (xxxx-100kmed-v2.vercel.app).
  const isProd = process.env.VERCEL_ENV === 'production'

  if (!isProd) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /solution/noter/ et /connexion NE sont PAS ici : un Disallow bloque le crawl
        // mais PAS l'indexation (Google indexe l'URL nue si elle est liée). Ces routes
        // portent désormais un <meta noindex> (cf. leurs layout.tsx) → il faut donc
        // laisser Googlebot les crawler pour qu'il VOIE le noindex et les retire de
        // l'index. Cf. audit SEO 2026-07-19 (« indexée malgré le blocage par robots.txt »).
        disallow: [
          '/mon-compte/',
          '/api/',
        ],
      },
    ],
    // Deux sitemaps au contenu identique : /sitemap.xml (historique) et /sitemap-main.xml
    // (URL neuve, pour repartir sur une entité GSC sans l'erreur « Impossible de récupérer »
    // collante — cf docs/2026-07-19-audit-seo-indexation-gsc.md).
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-main.xml`],
  }
}
