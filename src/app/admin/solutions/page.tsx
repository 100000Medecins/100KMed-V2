export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { getAllSolutionsAdmin } from '@/lib/db/admin-solutions'
import { getAllCategoriesAdmin } from '@/lib/db/categories'
import AdminCategoryFilter from '@/components/admin/AdminCategoryFilter'
import AdminSolutionsTable from '@/components/admin/AdminSolutionsTable'
import ScrollToSolution from '@/components/admin/ScrollToSolution'
import RecalcAllSolutionsButton from '@/components/admin/RecalcAllSolutionsButton'
import Button from '@/components/ui/Button'

interface PageProps {
  searchParams: Promise<{ categorie?: string }>
}

export default async function AdminSolutionsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const [solutions, categories] = await Promise.all([
    getAllSolutionsAdmin(),
    getAllCategoriesAdmin(),
  ])

  const selectedCategoryId = searchParams.categorie || null
  const filtered = selectedCategoryId
    ? solutions.filter((s) => s.categorie?.id === selectedCategoryId)
    : solutions

  return (
    <div>
      <Suspense fallback={null}><ScrollToSolution /></Suspense>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Solutions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} solution{filtered.length > 1 ? 's' : ''}
            {' · '}
            <span className="text-green-600 font-medium">{filtered.filter(s => s.actif).length} active{filtered.filter(s => s.actif).length > 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RecalcAllSolutionsButton />
          <Button href="/admin/solutions/nouveau" leftIcon={<Plus className="w-4 h-4" />}>
            Ajouter une solution
          </Button>
        </div>
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

      {/* Table + recherche */}
      <AdminSolutionsTable solutions={filtered as any} />
    </div>
  )
}
