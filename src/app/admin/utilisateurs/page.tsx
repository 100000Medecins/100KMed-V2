export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import AdminUtilisateursClient from '@/components/admin/AdminUtilisateursClient'

async function getAllUsers(supabase: ReturnType<typeof createServiceRoleClient>) {
  const PAGE = 1000
  let all: unknown[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, pseudo, nom, prenom, role, specialite, rpps, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function getData() {
  const supabase = createServiceRoleClient()

  const [users, { data: editeurs }] = await Promise.all([
    getAllUsers(supabase),
    supabase
      .from('editeurs')
      .select('id, nom, nom_commercial, logo_url, user_id')
      .order('nom', { ascending: true }),
  ])

  return { users, editeurs: editeurs ?? [] }
}

export default async function AdminUtilisateursPage() {
  const { users, editeurs } = await getData()
  return <AdminUtilisateursClient users={users} editeurs={editeurs} />
}
