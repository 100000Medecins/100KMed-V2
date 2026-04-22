export const dynamic = 'force-dynamic'

import { getAllSolutionsAdmin } from '@/lib/db/admin-solutions'
import SeoManager from '@/components/admin/SeoManager'

export default async function AdminSeoPage() {
  const solutions = await getAllSolutionsAdmin()

  const seoData = solutions.map((s) => ({
    id: s.id,
    nom: s.nom,
    categorie: (s.categorie as { nom: string | null } | null)?.nom ?? '',
    meta: (s.meta as { title?: string; description?: string } | null) ?? null,
    actif: s.actif,
  }))

  const withMeta = seoData.filter((s) => s.meta?.title).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">SEO des solutions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {withMeta} / {seoData.length} solutions avec un meta title renseigné
          </p>
        </div>
      </div>
      <SeoManager solutions={seoData} />
    </div>
  )
}
