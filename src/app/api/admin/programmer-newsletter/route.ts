import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { estAdmin } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id, scheduled_at } = await req.json()
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('newsletters')
    .update({ scheduled_at: scheduled_at ?? null })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
