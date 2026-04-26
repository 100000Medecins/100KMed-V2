import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ solutions: [], articles: [], categories: [], acronymes: [] })

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const [solutionsRes, articlesRes, categoriesRes, acronymesRes] = await Promise.all([
    s.rpc('search_solutions', { query: q, max_results: 6 }),
    s.rpc('search_articles', { query: q, max_results: 4 }),
    s.rpc('search_categories', { query: q, max_results: 3 }),
    s
      .from('acronymes')
      .select('sigle, definition')
      .or(`sigle.ilike.%${q}%,definition.ilike.%${q}%`)
      .order('sigle', { ascending: true })
      .limit(5),
  ])

  return NextResponse.json({
    solutions: solutionsRes.data ?? [],
    articles: articlesRes.data ?? [],
    categories: categoriesRes.data ?? [],
    acronymes: acronymesRes.data ?? [],
  })
}
