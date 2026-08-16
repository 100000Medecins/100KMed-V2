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

  // Environnements non-prod : dev.100000medecins.org (VERCEL_ENV=preview) et les URLs
  // preview Vercel automatiques (xxxx-100kmed-v2.vercel.app).
  const isProd = process.env.VERCEL_ENV === 'production'

  if (!isProd) {
    // ⚠️ Surtout PAS `Disallow: /` ici — c'est un piège, pas une protection.
    // Un Disallow bloque le CRAWL, donc Googlebot ne peut pas LIRE le `noindex` que
    // le layout racine sert hors prod (src/app/layout.tsx) → toute URL de dev déjà
    // connue de Google y reste indéfiniment : « Indexée malgré le blocage par le
    // fichier robots.txt » (GSC dev, détecté le 2026-08-05 sur un article de blog).
    // On laisse donc crawler pour que le noindex soit VU et fasse sortir les URLs de
    // l'index. Même raisonnement que /connexion et /solution/noter en prod (voir plus
    // bas et docs/2026-07-19-audit-seo-indexation-gsc.md).
    // Le noindex reste porté par 2 mécanismes : le <meta> du layout racine + l'en-tête
    // X-Robots-Tag posé dans next.config.mjs. Et aucun `sitemap` n'est déclaré hors
    // prod (cf. src/lib/seo/sitemap-entries.ts) → pas de nouvelles URLs offertes à la
    // découverte, on ne fait qu'autoriser la relecture de celles déjà connues.
    return {
      rules: [{ userAgent: '*', allow: '/', disallow: ['/mon-compte/', '/api/'] }],
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
    // Trois entrées pour un seul et même contenu (240 URLs), empilées par les tentatives
    // successives de déblocage du « Impossible de récupérer » collant de GSC :
    //  - /sitemap.xml       `<urlset>` historique (entrée GSC bloquée depuis le 27/05/2026)
    //  - /sitemap-main.xml  `<urlset>` à URL neuve (19/07/2026, bloqué lui aussi)
    //  - /sitemap-index.xml `<sitemapindex>` — TYPE de document différent (16/08/2026)
    // Cf. docs/2026-08-16-diagnostic-sitemap-gsc.md. À élaguer une fois qu'une entrée
    // passe en « Réussite » : garder l'index seul et retirer les deux autres.
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-main.xml`,
      `${baseUrl}/sitemap-index.xml`,
    ],
  }
}
