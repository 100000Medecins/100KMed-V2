import { MetadataRoute } from 'next'
import { getSitemapEntries } from '@/lib/seo/sitemap-entries'

// Sitemap mis en cache (ISR), régénéré au plus une fois par heure. La logique de génération
// (et le repli anti-5xx sur hoquet BDD) vit dans getSitemapEntries, partagée avec la route
// alternative /sitemap-main.xml. Cf docs/2026-07-19-audit-seo-indexation-gsc.md.
export const revalidate = 3600

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries()
}
