export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import PropositionsAdminClient from '@/components/admin/PropositionsAdminClient'

export type AdminProposition = {
  id: string
  type: 'idee' | 'correction'
  titre: string
  description: string
  url_concernee: string | null
  statut: 'en_attente' | 'traite' | 'refuse'
  admin_notes: string | null
  created_at: string
  updated_at: string
  proposer: { prenom: string | null; nom: string | null; pseudo: string | null; email: string | null } | null
}

async function getPropositions(): Promise<AdminProposition[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('propositions_utilisateurs')
    .select('id, user_id, type, titre, description, url_concernee, statut, admin_notes, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[admin/propositions] error:', error.message)
    return []
  }
  const rows = (data ?? []) as Array<AdminProposition & { user_id: string | null }>

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x)))
  const proposerMap = new Map<string, AdminProposition['proposer']>()
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (supabase as any)
      .from('users')
      .select('id, prenom, nom, pseudo, email, contact_email')
      .in('id', userIds)
    for (const u of users ?? []) {
      proposerMap.set(u.id, {
        prenom: u.prenom,
        nom: u.nom,
        pseudo: u.pseudo,
        email: u.contact_email ?? u.email,
      })
    }
  }

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    titre: r.titre,
    description: r.description,
    url_concernee: r.url_concernee,
    statut: r.statut,
    admin_notes: r.admin_notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    proposer: r.user_id ? proposerMap.get(r.user_id) ?? null : null,
  }))
}

export default async function AdminPropositionsPage() {
  const propositions = await getPropositions()
  return <PropositionsAdminClient propositions={propositions} />
}
