export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import AdminIndexEditor from '@/components/admin/AdminIndexEditor'

async function getSiteConfigMultiple(cles: string[]): Promise<Record<string, string>> {
  const supabase = createServiceRoleClient()
  const { data } = await (supabase as any)
    .from('site_config')
    .select('cle, valeur')
    .in('cle', cles)
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.cle] = row.valeur
  return map
}

async function getAllPages() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('pages_statiques')
    .select('id, slug, titre')
    .order('titre', { ascending: true })
  return data ?? []
}

async function getAllPartenaires() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('partenaires')
    .select('*')
    .order('position', { ascending: true })
  return data ?? []
}

export default async function AdminIndexPage() {
  const [config, pages, partenaires] = await Promise.all([
    getSiteConfigMultiple([
      'hero_titre',
      'hero_sous_titre',
      'hero_image',
      'label_partenaires',
      'section_articles_titre',
      'section_articles_slugs',
      'nav_irritants_visible',
      'nav_blog_visible',
      'nav_etudes_visible',
      'nav_questionnaires_visible',
      'section_communaute_visible',
    ]),
    getAllPages(),
    getAllPartenaires(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Page d'accueil</h1>
      <AdminIndexEditor config={config} pages={pages} partenaires={partenaires} />
    </div>
  )
}
