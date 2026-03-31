import { createServerClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

async function getActiveCategories() {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('categories')
      .select('nom, slug')
      .eq('actif', true)
      .order('position', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export default async function Navbar() {
  const categories = await getActiveCategories()
  return <NavbarClient categories={categories} />
}
