export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import CategoriesList from '@/components/admin/CategoriesList'
import GroupesCategoriesList from '@/components/admin/GroupesCategoriesList'
import type { Groupe } from '@/lib/db/categories'

async function getAllCategoriesAdmin() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

async function getGroupesAdmin(): Promise<Groupe[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { data, error } = await supabase
    .from('groupes_categories')
    .select('id, nom, ordre')
    .order('ordre', { ascending: true })
  if (error) throw error
  return (data ?? []) as Groupe[]
}

export default async function AdminCategoriesPage() {
  const [categories, groupes] = await Promise.all([
    getAllCategoriesAdmin(),
    getGroupesAdmin(),
  ])

  const catsForGroupes = (categories ?? []).map((c) => ({
    id: c.id,
    nom: c.nom,
    groupe_id: (c as Record<string, unknown>).groupe_id as string | null ?? null,
  }))

  return (
    <div className="space-y-10">
      {/* ── Groupes ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Groupes de catégories</h1>
            <p className="text-sm text-gray-500 mt-1">
              Organisez les catégories en groupes pour le mega-menu et la page comparatifs
            </p>
          </div>
        </div>
        <GroupesCategoriesList initialGroupes={groupes} categories={catsForGroupes} />
      </div>

      {/* ── Catégories ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-navy">Catégories</h2>
            <p className="text-sm text-gray-500 mt-1">
              {categories.length} catégorie{categories.length > 1 ? 's' : ''} — glissez pour réordonner
            </p>
          </div>
          <Link
            href="/admin/categories/nouveau"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Ajouter une catégorie
          </Link>
        </div>
        <CategoriesList initialCategories={categories} />
      </div>
    </div>
  )
}
