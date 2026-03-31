import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('categories')
      .select('nom, slug')
      .eq('actif', true)
      .order('position', { ascending: true })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
