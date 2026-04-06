import { createServerClient } from '@/lib/supabase/server'
import MissionCard from '@/components/ui/MissionCard'
import { missionItems } from '@/lib/data'

async function getSiteConfig(cles: string[]): Promise<Record<string, string>> {
  try {
    const supabase = await createServerClient()
    const { data } = await (supabase as any)
      .from('site_config')
      .select('cle, valeur')
      .in('cle', cles)
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.cle] = row.valeur
    return map
  } catch {
    return {}
  }
}

async function getPagesBySlugOrder(slugs: string[]) {
  if (slugs.length === 0) return []
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('pages_statiques')
      .select('slug, titre, image_couverture, meta_description')
      .in('slug', slugs)
    if (!data) return []
    // Respecter l'ordre des slugs configurés
    return slugs
      .map((slug) => data.find((p) => p.slug === slug))
      .filter(Boolean) as typeof data
  } catch {
    return []
  }
}

export default async function AboutMission() {
  const config = await getSiteConfig(['section_articles_titre', 'section_articles_slugs'])

  const titre = config['section_articles_titre'] ?? ''
  const slugsRaw = config['section_articles_slugs'] ?? ''
  const slugs = slugsRaw.split(',').map((s) => s.trim()).filter(Boolean)

  // Si des slugs sont configurés, charger les pages depuis la DB
  // Sinon fallback sur les missionItems hardcodés
  let items: { title: string; description: string; href: string; image?: string; color: string }[] = []

  if (slugs.length > 0) {
    const pages = await getPagesBySlugOrder(slugs)
    items = pages.map((p, i) => {
      const fallback = missionItems[i]
      return {
        title: p.titre,
        description: p.meta_description ?? fallback?.description ?? '',
        href: `/${p.slug}`,
        image: p.image_couverture ?? fallback?.image,
        color: fallback?.color ?? '#E0EAFF',
      }
    })
  } else {
    items = missionItems
  }

  // Parser le titre : peut contenir du HTML simple (<span>)
  const titreHtml = titre || '<span class="text-accent-blue">10000médecins.org</span>,<br class="hidden md:block" />pour vous accompagner dans l\'ère numérique.'

  return (
    <section className="py-20 md:py-28" id="about">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-navy leading-snug"
            dangerouslySetInnerHTML={{ __html: titreHtml }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {items.map((item) => (
            <MissionCard key={item.href} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
