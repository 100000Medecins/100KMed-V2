import { redirect } from 'next/navigation'
import { getCategorieDefaut } from '@/lib/db/categories'

export default async function SolutionsIndexPage() {
  const categorie = await getCategorieDefaut()
  redirect(`/solutions/${categorie.slug || categorie.id}`)
}
