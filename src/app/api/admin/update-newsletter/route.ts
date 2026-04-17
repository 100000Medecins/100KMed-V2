import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { id, sujet, contenu_html } = await req.json()

  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('newsletters')
    .update({ sujet, contenu_html })
    .eq('id', id)
    .eq('status', 'draft') // sécurité : ne pas modifier une newsletter déjà envoyée

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
