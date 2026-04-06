import { NextResponse } from 'next/server'
import { getSectionsForSlug } from '@/lib/actions/questionnaires'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const sections = await getSectionsForSlug(params.slug)
    return NextResponse.json(sections)
  } catch {
    return NextResponse.json([])
  }
}
