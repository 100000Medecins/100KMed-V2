'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

/** Trie 2 UUIDs pour respecter le CHECK (solution_a_id < solution_b_id). */
function orderPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1]
}

export type AdminSolutionLien = {
  id: string
  type: string
  description: string | null
  solution_a_id: string
  solution_b_id: string
  voisin: {
    id: string
    nom: string
    slug: string | null
    logo_url: string | null
    categorie: { slug: string | null; nom: string | null } | null
  }
}

/**
 * Récupère les liens d'une solution (pour l'admin). Retourne le "voisin" de chaque lien.
 */
export async function listSolutionLiensAdmin(solutionId: string): Promise<AdminSolutionLien[]> {
  await assertAdmin()
  try {
    const supabase = createServiceRoleClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: liens, error } = await (supabase as any)
      .from('solution_liens')
      .select('id, type, description, solution_a_id, solution_b_id')
      .or(`solution_a_id.eq.${solutionId},solution_b_id.eq.${solutionId}`)

    if (error) { console.error('[listSolutionLiensAdmin]', JSON.stringify(error)); return [] }
    const liensTyped = (liens ?? []) as Array<{ id: string; type: string; description: string | null; solution_a_id: string; solution_b_id: string }>
    if (liensTyped.length === 0) return []

    const voisinIds = Array.from(new Set(liensTyped.map((l) => l.solution_a_id === solutionId ? l.solution_b_id : l.solution_a_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: solutions } = await (supabase as any)
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories(slug, nom)')
      .in('id', voisinIds)
    const solMap = new Map<string, AdminSolutionLien['voisin']>()
    for (const s of (solutions ?? []) as Array<AdminSolutionLien['voisin']>) {
      solMap.set(s.id, s)
    }

    return liensTyped.map((l) => {
      const voisinId = l.solution_a_id === solutionId ? l.solution_b_id : l.solution_a_id
      const voisin = solMap.get(voisinId)
      return voisin ? {
        id: l.id,
        type: l.type,
        description: l.description,
        solution_a_id: l.solution_a_id,
        solution_b_id: l.solution_b_id,
        voisin,
      } : null
    }).filter((l): l is AdminSolutionLien => l !== null)
  } catch (e) {
    console.error('[listSolutionLiensAdmin] unexpected', e)
    return []
  }
}

export async function createSolutionLien(input: {
  fromSolutionId: string
  toSolutionId: string
  type: string
  description?: string | null
}): Promise<{ ok: true } | { error: string }> {
  await assertAdmin()
  if (input.fromSolutionId === input.toSolutionId) return { error: 'Une solution ne peut être liée à elle-même.' }
  const [a, b] = orderPair(input.fromSolutionId, input.toSolutionId)
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('solution_liens').insert({
    solution_a_id: a,
    solution_b_id: b,
    type: input.type,
    description: input.description?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/admin/solutions/${input.fromSolutionId}/modifier`)
  revalidatePath(`/admin/solutions/${input.toSolutionId}/modifier`)
  return { ok: true }
}

export async function updateSolutionLien(lienId: string, patch: { type?: string; description?: string | null }) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const updates: Record<string, unknown> = {}
  if (patch.type !== undefined) updates.type = patch.type
  if (patch.description !== undefined) updates.description = patch.description?.trim() || null
  if (Object.keys(updates).length === 0) return { ok: true as const }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('solution_liens').update(updates).eq('id', lienId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

export async function deleteSolutionLien(lienId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('solution_liens').delete().eq('id', lienId)
  if (error) return { error: error.message }
  return { ok: true as const }
}

/** Recherche de solutions par nom pour le sélecteur admin. */
export async function searchSolutionsForLien(q: string, excludeId: string): Promise<Array<{ id: string; nom: string; categorie: string | null }>> {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const query = q.trim()
  if (query.length < 2) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('solutions')
    .select('id, nom, categorie:categories(nom)')
    .ilike('nom', `%${query}%`)
    .neq('id', excludeId)
    .limit(20)
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    nom: row.nom as string,
    categorie: (row.categorie as { nom: string | null } | null)?.nom ?? null,
  }))
}
