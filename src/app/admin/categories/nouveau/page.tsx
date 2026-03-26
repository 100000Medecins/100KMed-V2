export const dynamic = 'force-dynamic'

import CategorieForm from '@/components/admin/CategorieForm'
import { createCategorie } from '@/lib/actions/admin'

export default function AdminNewCategoriePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Ajouter une catégorie</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <CategorieForm action={createCategorie} />
      </div>
    </div>
  )
}
