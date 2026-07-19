import { createPublicClient } from '@/lib/supabase/server'

export type Annonce = {
  id: string
  titre: string
  contenu: string | null
  cta_label: string | null
  cta_url: string | null
  variante: string | null // 'info' | 'success' | 'warning'
  date_debut: string
  date_fin: string
  actif: boolean
  ordre: number | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Annonces à afficher sur l'accueil : actif = true ET now ∈ [date_debut, date_fin].
 *
 * `createPublicClient()` (cookie-less) → l'ISR de la home reste actif. La policy RLS
 * `annonces_select_public` filtre déjà côté serveur ; les filtres explicites ci-dessous
 * garantissent l'ordre (`ordre`) et servent de repli robuste.
 *
 * Contenu non critique → on log + retourne [] en cas d'erreur (pattern getHomepageVideos).
 */
export async function getAnnoncesActives(): Promise<Annonce[]> {
  const supabase = createPublicClient()
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('annonces')
    .select('*')
    .eq('actif', true)
    .lte('date_debut', now)
    .gte('date_fin', now)
    .order('ordre', { ascending: true })
    .order('date_debut', { ascending: false })
  if (error) {
    console.error('[getAnnoncesActives] Supabase error:', error.message)
    return []
  }
  return (data ?? []) as Annonce[]
}
