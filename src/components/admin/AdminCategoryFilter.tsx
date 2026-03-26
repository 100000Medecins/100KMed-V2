'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Category {
  id: string
  nom: string
}

interface AdminCategoryFilterProps {
  categories: Category[]
  currentCategoryId: string | null
}

export default function AdminCategoryFilter({ categories, currentCategoryId }: AdminCategoryFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('categorie', value)
    } else {
      params.delete('categorie')
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <select
      value={currentCategoryId || ''}
      onChange={(e) => handleChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
    >
      <option value="">Toutes les catégories</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.nom}
        </option>
      ))}
    </select>
  )
}
