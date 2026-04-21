import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('acronymes')
    .select('sigle, definition, lien')
    .order('sigle')
  return NextResponse.json(data ?? [])
}
