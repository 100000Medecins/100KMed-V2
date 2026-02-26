import { NextRequest, NextResponse } from 'next/server'
import { getAvisUtilisateursPaginated } from '@/lib/db/evaluations'

export async function GET(
  request: NextRequest,
  { params }: { params: { solutionId: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
  const tri = searchParams.get('tri') === 'note' ? 'note' as const : 'date' as const

  try {
    const result = await getAvisUtilisateursPaginated(params.solutionId, {
      page,
      limit,
      tri,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
