import { createServerClient } from '@/lib/supabase/server'
import type { PageStatique } from '@/types/models'

export async function getPagesStatiques(): Promise<PageStatique[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .order('titre', { ascending: true })

  if (error) throw error
  return data as PageStatique[]
}

export async function getPageBySlug(slug: string): Promise<PageStatique> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as PageStatique
}
