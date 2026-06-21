'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
  if (token !== expected) throw new Error('Non autorisé')
}

/** Marque tous les événements du flux comme lus (remet le badge à zéro). */
export async function markAllActivityRead(): Promise<void> {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('activity_log').update({ lu: true }).eq('lu', false)
  revalidatePath('/admin/activite')
  revalidatePath('/admin', 'layout')
}
