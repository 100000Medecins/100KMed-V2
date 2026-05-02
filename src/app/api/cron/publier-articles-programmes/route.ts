import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articles, error } = await (supabase as any)
    .from('articles')
    .select('id, slug, scheduled_at')
    .eq('statut', 'brouillon')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ ok: true, published: 0 })
  }

  let publishedCount = 0
  const errors: string[] = []

  for (const article of articles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('articles')
      .update({
        statut: 'publié',
        date_publication: article.scheduled_at,
        scheduled_at: null,
      })
      .eq('id', article.id)

    if (updateError) {
      errors.push(`${article.id}: ${updateError.message}`)
    } else {
      publishedCount++
      revalidatePath(`/blog/${article.slug}`)
    }
  }

  revalidatePath('/blog')

  return NextResponse.json({
    ok: true,
    published: publishedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
