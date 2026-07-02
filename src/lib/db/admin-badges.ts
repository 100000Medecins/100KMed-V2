import { createServiceRoleClient } from '@/lib/supabase/server'

export type AdminBadges = {
  editeurClaims: number
  etudesThese: number
  emails: number
  videos: number
  propositions: number
  citations: number
  communautes: number
  activite: number
}

/**
 * Compte les items en attente de modération côté admin.
 * Sources :
 * - editeur_claims (statut = en_attente) + editeur_demandes_referencement (toutes les lignes) → badge cumulé editeurClaims
 * - questionnaires_these + etudes_cliniques (statut = en_attente)
 * - emails_campagnes pending dont scheduled_at <= now() (envois en retard ou imminents)
 * - videos (statut = en_attente) — propositions vidéos utilisateurs à modérer
 * - propositions_utilisateurs (statut = en_attente) — idées + corrections utilisateurs
 * - solution_communautes (statut = en_attente) — groupes WhatsApp/Discord/forum proposés
 */
export async function getAdminBadges(): Promise<AdminBadges> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  const [editeurClaims, editeurDemandes, etudes, questionnaires, emails, videos, propositions, citations, communautes, activite] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('editeur_claims')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('editeur_demandes_referencement')
      .select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('etudes_cliniques')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('questionnaires_these')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('emails_campagnes')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'pending')
      .lte('scheduled_at', now),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('propositions_utilisateurs')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('citations')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('solution_communautes')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'en_attente'),
    supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('lu', false),
  ])

  return {
    editeurClaims: (editeurClaims.count ?? 0) + (editeurDemandes.count ?? 0),
    etudesThese: (etudes.count ?? 0) + (questionnaires.count ?? 0),
    emails: emails.count ?? 0,
    videos: videos.count ?? 0,
    propositions: propositions.count ?? 0,
    citations: citations.count ?? 0,
    communautes: communautes.count ?? 0,
    activite: activite.count ?? 0,
  }
}
