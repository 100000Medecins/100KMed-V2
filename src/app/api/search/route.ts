import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ solutions: [], articles: [], categories: [] })

  const supabase = createServiceRoleClient()

  const [solutionsRes, articlesRes, categoriesRes] = await Promise.all([
    supabase.rpc('search_solutions', { query: q, max_results: 6 }),
    supabase.rpc('search_articles', { query: q, max_results: 4 }),
    supabase.rpc('search_categories', { query: q, max_results: 3 }),
  ])

  return NextResponse.json({
    solutions: solutionsRes.data ?? [],
    articles: articlesRes.data ?? [],
    categories: categoriesRes.data ?? [],
  })
}
