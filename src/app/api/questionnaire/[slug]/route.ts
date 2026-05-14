import { NextResponse } from 'next/server'
import { getSectionsForSlug } from '@/lib/actions/questionnaires'

export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const sections = await getSectionsForSlug(params.slug)
    return NextResponse.json(sections)
  } catch {
    return NextResponse.json([])
  }
}
