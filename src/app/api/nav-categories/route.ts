import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type NavCategorie = {
  nom: string
  slug: string | null
  groupe_id: string | null
  groupe_nom: string | null
  groupe_ordre: number | null
}

export type NavResponse = {
  categories: NavCategorie[]
  navConfig: { irritants_visible: boolean; blog_visible: boolean }
}

export async function GET() {
  try {
    const supabase = await createServerClient()

    const [{ data: categoriesData }, { data: configData }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('categories')
        .select('nom, slug, groupe_id, groupes_categories(id, nom, ordre)')
        .eq('actif', true)
        .order('position', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('site_config')
        .select('cle, valeur')
        .in('cle', ['nav_irritants_visible', 'nav_blog_visible']),
    ])

    const categories: NavCategorie[] = (categoriesData ?? []).map((c: Record<string, unknown>) => {
      const g = c.groupes_categories as { id: string; nom: string; ordre: number } | null
      return {
        nom: c.nom as string,
        slug: c.slug as string | null,
        groupe_id: g?.id ?? null,
        groupe_nom: g?.nom ?? null,
        groupe_ordre: g?.ordre ?? null,
      }
    })

    const configMap: Record<string, string> = {}
    for (const row of configData ?? []) configMap[row.cle] = row.valeur

    const navConfig = {
      irritants_visible: configMap['nav_irritants_visible'] !== 'false',
      blog_visible: configMap['nav_blog_visible'] !== 'false',
    }

    return NextResponse.json({ categories, navConfig } satisfies NavResponse)
  } catch {
    return NextResponse.json({ categories: [], navConfig: { irritants_visible: true, blog_visible: true } })
  }
}
