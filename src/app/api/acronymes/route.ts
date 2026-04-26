import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('acronymes')
    .select('sigle, definition, lien')
    .order('sigle')
  return NextResponse.json(data ?? [])
}
