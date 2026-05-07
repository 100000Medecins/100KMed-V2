'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyFusionToken } from '@/lib/auth/fusionToken'

export interface FusionAccount {
  id: string
  email: string | null
  contact_email: string | null
  nom: string | null
  prenom: string | null
  rpps: string | null
}

/**
 * Retourne les détails des deux comptes impliqués dans la fusion.
 * Vérifie et décode le token HMAC avant d'accéder à la BDD.
 */
export async function getFusionDetails(
  token: string
): Promise<{ source: FusionAccount; target: FusionAccount } | null> {
  const tokenData = verifyFusionToken(token)
  if (!tokenData) return null

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const [{ data: source }, { data: target }] = await Promise.all([
    s.from('users').select('id, email, contact_email, nom, prenom, rpps').eq('id', tokenData.sourceId).single(),
    s.from('users').select('id, email, contact_email, nom, prenom, rpps').eq('id', tokenData.targetId).single(),
  ])

  if (!source || !target) return null
  return { source: source as FusionAccount, target: target as FusionAccount }
}

/**
 * Fusionne deux comptes en conservant keepId et supprimant l'autre.
 * Migre : evaluations, solutions_utilisees, solutions_favorites.
 * Retourne une URL de session pour le compte conservé.
 */
export async function mergeAccounts(
  token: string,
  keepId: string
): Promise<{ ok: boolean; error?: string; redirectUrl?: string }> {
  const tokenData = verifyFusionToken(token)
  if (!tokenData) return { ok: false, error: 'Lien de fusion invalide ou expiré.' }

  const { sourceId, targetId } = tokenData
  if (keepId !== sourceId && keepId !== targetId) {
    return { ok: false, error: 'Compte cible invalide.' }
  }
  const deleteId = keepId === sourceId ? targetId : sourceId

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any

  // Migrer les évaluations
  await s.from('evaluations').update({ user_id: keepId }).eq('user_id', deleteId)

  // Migrer solutions_utilisees (éviter les doublons)
  const { data: keptSU } = await s.from('solutions_utilisees').select('solution_id').eq('user_id', keepId)
  const keptSolIds = new Set(((keptSU as Array<{ solution_id: string }>) || []).map((r) => r.solution_id))
  const { data: deleteSU } = await s.from('solutions_utilisees').select('id, solution_id').eq('user_id', deleteId)
  for (const su of (deleteSU as Array<{ id: string; solution_id: string }>) || []) {
    if (!keptSolIds.has(su.solution_id)) {
      await s.from('solutions_utilisees').update({ user_id: keepId }).eq('id', su.id)
    } else {
      await s.from('solutions_utilisees').delete().eq('id', su.id)
    }
  }

  // Migrer solutions_favorites (éviter les doublons)
  const { data: keptFavs } = await s.from('solutions_favorites').select('solution_id').eq('user_id', keepId)
  const keptFavIds = new Set(((keptFavs as Array<{ solution_id: string }>) || []).map((r) => r.solution_id))
  const { data: deleteFavs } = await s.from('solutions_favorites').select('id, solution_id').eq('user_id', deleteId)
  for (const fav of (deleteFavs as Array<{ id: string; solution_id: string }>) || []) {
    if (!keptFavIds.has(fav.solution_id)) {
      await s.from('solutions_favorites').update({ user_id: keepId }).eq('id', fav.id)
    } else {
      await s.from('solutions_favorites').delete().eq('id', fav.id)
    }
  }

  // Copier le RPPS du compte supprimé vers le compte conservé si besoin
  const { data: keepProfile } = await s.from('users').select('rpps, email').eq('id', keepId).single()
  const { data: deleteProfile } = await s.from('users').select('rpps, nom, prenom, specialite, mode_exercice').eq('id', deleteId).single()
  if (!keepProfile?.rpps && deleteProfile?.rpps) {
    const rppsUpdate: Record<string, unknown> = { rpps: deleteProfile.rpps }
    if (!keepProfile?.email?.includes('@') || keepProfile.email?.endsWith('@psc.sante.fr')) {
      // pas besoin de toucher à l'email ici
    }
    if (deleteProfile.nom) rppsUpdate.nom = deleteProfile.nom
    if (deleteProfile.prenom) rppsUpdate.prenom = deleteProfile.prenom
    if (deleteProfile.specialite) rppsUpdate.specialite = deleteProfile.specialite
    if (deleteProfile.mode_exercice) rppsUpdate.mode_exercice = deleteProfile.mode_exercice
    await s.from('users').update(rppsUpdate).eq('id', keepId)
  }

  // Migrer les questionnaires de thèse créés par le compte supprimé
  await s.from('questionnaires_these').update({ created_by: keepId }).eq('created_by', deleteId)

  // Supprimer les dépendances du compte supprimé (FK sans CASCADE)
  await s.from('users_notification_preferences').delete().eq('user_id', deleteId)
  await s.from('users_preferences').delete().eq('user_id', deleteId)
  await s.from('editeur_claims').delete().eq('user_id', deleteId)
  await s.from('solutions_favorites').delete().eq('user_id', deleteId)

  // Supprimer le compte source
  const { error: deletePublicError } = await s.from('users').delete().eq('id', deleteId)
  if (deletePublicError) {
    console.error('[mergeAccounts] échec suppression public.users:', deletePublicError)
    return { ok: false, error: 'Erreur lors de la suppression du compte.' }
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(deleteId)
  if (deleteAuthError) {
    console.error('[mergeAccounts] échec deleteUser auth:', deleteAuthError)
    return { ok: false, error: 'Erreur lors de la suppression du compte auth.' }
  }

  // Publier les évaluations en attente sur le compte conservé (maintenant qu'il a le RPPS)
  await s.from('evaluations').update({ statut: 'publiee' }).eq('user_id', keepId).eq('statut', 'en_attente_psc')

  // Générer un magic link pour établir la session sur le compte conservé
  // Utiliser auth.users.email (pas public.users.email) — évite de créer un utilisateur fantôme
  // si l'email PSC synthétique diffère de public.users.email
  const { data: authUserData } = await supabase.auth.admin.getUserById(keepId)
  const keepEmail = authUserData.user?.email
  if (!keepEmail) return { ok: false, error: 'Impossible de récupérer l\'email du compte conservé.' }

  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: keepEmail,
  })
  if (!linkData?.properties) return { ok: false, error: 'Erreur lors de la génération de la session.' }

  const tokenHash = linkData.properties.hashed_token
  const redirectUrl = `/auth/psc-session?token=${tokenHash}&next=${encodeURIComponent('/mon-compte/profil?fusion=ok')}`
  return { ok: true, redirectUrl }
}
