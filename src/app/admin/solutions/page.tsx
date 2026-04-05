export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { getAllSolutionsAdmin } from '@/lib/db/admin-solutions'
import { getCategories } from '@/lib/db/categories'
import DeleteSolutionButton from '@/components/admin/DeleteSolutionButton'
import AdminCategoryFilter from '@/components/admin/AdminCategoryFilter'
import ToggleSolutionActif from '@/components/admin/ToggleSolutionActif'

interface PageProps {
  searchParams: { categorie?: string }
}

export default async function AdminSolutionsPage({ searchParams }: PageProps) {
  const [solutions, categories] = await Promise.all([
    getAllSolutionsAdmin(),
    getCategories(),
  ])

  const selectedCategoryId = searchParams.categorie || null
  const filtered = selectedCategoryId
    ? solutions.filter((s) => s.categorie?.id === selectedCategoryId)
    : solutions

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Solutions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} solution{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/solutions/nouveau"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Ajouter une solution
        </Link>
      </div>

      {/* Filtre par catégorie */}
      <div className="mb-4">
        <Suspense fallback={null}>
          <AdminCategoryFilter
            categories={categories.map((c) => ({ id: c.id, nom: c.nom }))}
            currentCategoryId={selectedCategoryId}
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Catégorie
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Éditeur
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Actif
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((solution) => (
                <tr key={solution.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy text-sm">{solution.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.categorie?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.editeur?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-center hidden md:table-cell">
                    <ToggleSolutionActif
                      solutionId={solution.id}
                      actif={solution.actif ?? true}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/solutions/${solution.id}/modifier`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                        title="Modifier"
                      >
                        Éditer
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <DeleteSolutionButton solutionId={solution.id} nom={solution.nom} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucune solution pour le moment.
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
