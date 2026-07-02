import { createServiceRoleClient } from '@/lib/supabase/server'
import { CITATIONS, type Citation } from '@/lib/constants/citations'

/**
 * Citations publiées pour le carrousel public.
 * Service-role (pas de cookies()) → compatible ISR de la page catalogue.
 *
 * Résilience : si la table est vide ou indisponible, on retombe sur la
 * constante front `CITATIONS` (le carrousel ne disparaît jamais). La constante
 * sert aussi de seed initial (scripts/seed-citations.ts).
 */
export async function getCitationsActives(): Promise<Citation[]> {
  try {
    const supabase = createServiceRoleClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('citations')
      .select('text, auteur')
      .eq('statut', 'publiee')

    if (error || !data || data.length === 0) return CITATIONS
    return (data as { text: string; auteur: string | null }[]).map((c) => ({
      text: c.text,
      auteur: c.auteur ?? '',
    }))
  } catch {
    return CITATIONS
  }
}

export type CitationAdmin = {
  id: string
  text: string
  auteur: string | null
  statut: 'en_attente' | 'publiee' | 'refusee'
  propose_par: string | null
  created_at: string
}

/**
 * Toutes les citations pour l'admin (tous statuts), récentes d'abord.
 */
export async function getAllCitationsAdmin(): Promise<CitationAdmin[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('citations')
    .select('id, text, auteur, statut, propose_par, created_at')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as CitationAdmin[]
}
