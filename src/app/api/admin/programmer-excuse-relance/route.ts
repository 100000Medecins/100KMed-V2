import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

function generateAdminToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateAdminToken()) throw new Error('Non autorisé')
}

async function upsertConfig(supabase: ReturnType<typeof createServiceRoleClient>, cle: string, valeur: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('site_config').upsert({ cle, valeur })
}

async function deleteConfig(supabase: ReturnType<typeof createServiceRoleClient>, cle: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('site_config').delete().eq('cle', cle)
}

/** GET — retourne la programmation actuelle */
export async function GET() {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('site_config')
    .select('cle, valeur')
    .in('cle', ['excuse_scheduled_at', 'excuse_scheduled_sujet', 'excuse_scheduled_html'])

  const config: Record<string, string> = {}
  for (const row of data ?? []) config[row.cle] = row.valeur

  return NextResponse.json({
    scheduledAt: config['excuse_scheduled_at'] ?? null,
    sujet: config['excuse_scheduled_sujet'] ?? null,
    hasHtml: !!config['excuse_scheduled_html'],
  })
}

/** POST — programme l'envoi à une date/heure donnée */
export async function POST(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { scheduledAt, sujet, html } = await req.json()
  if (!scheduledAt || !sujet || !html) {
    return NextResponse.json({ error: 'scheduledAt, sujet et html sont requis' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  await upsertConfig(supabase, 'excuse_scheduled_at', scheduledAt)
  await upsertConfig(supabase, 'excuse_scheduled_sujet', sujet)
  await upsertConfig(supabase, 'excuse_scheduled_html', html)

  return NextResponse.json({ ok: true, scheduledAt })
}

/** DELETE — annule la programmation */
export async function DELETE() {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  await deleteConfig(supabase, 'excuse_scheduled_at')
  await deleteConfig(supabase, 'excuse_scheduled_sujet')
  await deleteConfig(supabase, 'excuse_scheduled_html')

  return NextResponse.json({ ok: true })
}
