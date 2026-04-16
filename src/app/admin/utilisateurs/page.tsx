export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import AdminUtilisateursClient from '@/components/admin/AdminUtilisateursClient'

async function getAllUsers(supabase: ReturnType<typeof createServiceRoleClient>) {
  const PAGE = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
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

  const [users, { data: editeurs }, { count: nbSansEmailAvecNotes }] = await Promise.all([
    getAllUsers(supabase),
    supabase
      .from('editeurs')
      .select('id, nom, nom_commercial, logo_url, user_id')
      .order('nom', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('evaluations')
      .select('user_id', { count: 'exact', head: false })
      .not('last_date_note', 'is', null)
      .then(async ({ data }: { data: { user_id: string }[] | null }) => {
        if (!data) return { count: 0 }
        const userIds = [...new Set(data.map((e: { user_id: string }) => e.user_id))]
        // Parmi ces users, lesquels n'ont pas d'email ?
        const { count } = await (supabase as any)
          .from('users')
          .select('id', { count: 'exact', head: true })
          .in('id', userIds)
          .is('email', null)
        return { count: count ?? 0 }
      }),
  ])

  return { users, editeurs: editeurs ?? [], nbSansEmailAvecNotes: nbSansEmailAvecNotes ?? 0 }
}

export default async function AdminUtilisateursPage() {
  const { users, editeurs, nbSansEmailAvecNotes } = await getData()
  const nbSansEmail = users.filter(u => !u.email).length
  const notice = nbSansEmail > 0
    ? `${nbSansEmail.toLocaleString('fr-FR')} comptes sans email (connexions PSC). ${nbSansEmailAvecNotes > 0 ? `${nbSansEmailAvecNotes} ont posté des évaluations.` : 'Aucun n\'a posté d\'évaluation.'} Email non disponible dans l'annuaire RPPS public.`
    : null
  return <AdminUtilisateursClient users={users} editeurs={editeurs} notice={notice} />
}
