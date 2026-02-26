import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://10000medecins.org'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/mon-compte/',
          '/solution/noter/',
          '/api/',
          '/connexion',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
