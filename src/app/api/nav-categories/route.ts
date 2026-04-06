import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type NavCategorie = {
  nom: string
  slug: string | null
  groupe_id: string | null
  groupe_nom: string | null
  groupe_ordre: number | null
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('categories')
      .select('nom, slug, groupe_id, groupes_categories(id, nom, ordre)')
      .eq('actif', true)
      .order('position', { ascending: true })

    const result: NavCategorie[] = (data ?? []).map((c: Record<string, unknown>) => {
      const g = c.groupes_categories as { id: string; nom: string; ordre: number } | null
      return {
        nom: c.nom as string,
        slug: c.slug as string | null,
        groupe_id: g?.id ?? null,
        groupe_nom: g?.nom ?? null,
        groupe_ordre: g?.ordre ?? null,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json([])
  }
}
