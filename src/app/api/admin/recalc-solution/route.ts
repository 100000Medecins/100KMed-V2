import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { recalcResultatsPourSolution } from '@/lib/actions/evaluation'
import { createServiceRoleClient } from '@/lib/supabase/server'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return token === generateToken()
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()

  if (body.all === true) {
    const supabase = createServiceRoleClient()
    const { data: solutions } = await supabase.from('solutions').select('id').eq('actif', true)
    const ids = (solutions ?? []).map((s) => s.id as string)
    for (const id of ids) {
      await recalcResultatsPourSolution(id)
    }
    return NextResponse.json({ ok: true, count: ids.length })
  }

  const { solutionId } = body
  if (!solutionId) {
    return NextResponse.json({ error: 'solutionId manquant' }, { status: 400 })
  }

  await recalcResultatsPourSolution(solutionId)
  return NextResponse.json({ ok: true, solutionId })
}
