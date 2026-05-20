import { createServiceRoleClient } from '@/lib/supabase/server'

export type CommunautePublique = {
  id: string
  type: string
  nom: string
  url: string
  description: string | null
}

/**
 * Liste les communautés validées d'une solution (pour l'affichage public).
 */
export async function getCommunautesPubliques(solutionId: string): Promise<CommunautePublique[]> {
  try {
    const supabase = createServiceRoleClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('solution_communautes')
      .select('id, type, nom, url, description')
      .eq('solution_id', solutionId)
      .eq('statut', 'approuve')
      .order('type')
      .order('created_at')
    if (error) {
      console.error('[getCommunautesPubliques]', JSON.stringify(error))
      return []
    }
    return (data ?? []) as CommunautePublique[]
  } catch (e) {
    console.error('[getCommunautesPubliques] unexpected', e)
    return []
  }
}
