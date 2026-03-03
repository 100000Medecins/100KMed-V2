export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteCategorieButton from '@/components/admin/DeleteCategorieButton'
import ToggleCategorieActif from '@/components/admin/ToggleCategorieActif'

async function getAllCategoriesAdmin() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true })

  if (error) throw error
  return data
}

export default async function AdminCategoriesPage() {
  const categories = await getAllCategoriesAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Catégories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''}
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

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Intro
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                    {cat.position ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-navy text-sm">{cat.nom}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {cat.intro || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ToggleCategorieActif categorieId={cat.id} actif={cat.actif ?? false} />
                      <span className={`text-xs font-medium ${cat.actif ? 'text-green-700' : 'text-gray-400'}`}>
                        {cat.actif ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/categories/${cat.id}/modifier`}
                        className="p-2 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <DeleteCategorieButton categorieId={cat.id} nom={cat.nom} />
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucune catégorie pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
