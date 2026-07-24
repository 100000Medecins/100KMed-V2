'use server'

import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'
import { retryTransientAuth } from '@/lib/supabase/retry'
import { verifyFusionToken } from '@/lib/auth/fusionToken'
import { recalcResultatsPourSolution, ensureSolutionUtilisee } from '@/lib/actions/evaluation'

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

  // Récupérer les évals du compte supprimé (pour migration + recalc)
  type EvalRow = { id: string; solution_id: string; last_date_note: string | null; created_at: string | null }
  const { data: evalsToMigrate } = await s
    .from('evaluations')
    .select('id, solution_id, last_date_note, created_at')
    .eq('user_id', deleteId)
  const deleteEvals = (evalsToMigrate as EvalRow[]) || []
  const migratedSolutionIds = [...new Set(
    deleteEvals.map((e) => e.solution_id).filter(Boolean)
  )] as string[]

  // Migrer les évaluations en dédoublonnant par solution.
  // La table evaluations a UNIQUE(user_id, solution_id) : un UPDATE en aveugle
  // échouerait si les 2 comptes ont évalué la même solution. Dans ce cas, on
  // conserve l'évaluation la plus récente (last_date_note, sinon created_at).
  const { data: keptEvalsRaw } = await s
    .from('evaluations')
    .select('id, solution_id, last_date_note, created_at')
    .eq('user_id', keepId)
  const keptEvalBySolution = new Map<string, EvalRow>(
    ((keptEvalsRaw as EvalRow[]) || []).map((e) => [e.solution_id, e])
  )
  for (const ev of deleteEvals) {
    const kept = keptEvalBySolution.get(ev.solution_id)
    if (!kept) {
      // Pas de doublon → simple réassignation
      await s.from('evaluations').update({ user_id: keepId }).eq('id', ev.id)
    } else {
      // Doublon sur la même solution → garder la plus récente
      const evDate = ev.last_date_note || ev.created_at || ''
      const keptDate = kept.last_date_note || kept.created_at || ''
      if (evDate > keptDate) {
        await s.from('evaluations').delete().eq('id', kept.id)
        await s.from('evaluations').update({ user_id: keepId }).eq('id', ev.id)
      } else {
        await s.from('evaluations').delete().eq('id', ev.id)
      }
    }
  }

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

  // Préparer la copie du RPPS (+ identité PSC) du compte supprimé vers le compte conservé.
  // ⚠️ L'UPDATE est DIFFÉRÉ après la suppression du compte source (plus bas) : l'appliquer
  // ici créerait deux lignes avec le même RPPS → violation UNIQUE(users.rpps) dès qu'on
  // conserve le compte email/mdp (rpps NULL) et supprime le compte PSC (porteur du RPPS).
  const { data: keepProfile } = await s.from('users').select('rpps').eq('id', keepId).single()
  const { data: deleteProfile } = await s.from('users').select('rpps, nom, prenom, specialite, mode_exercice').eq('id', deleteId).single()
  let rppsUpdate: Record<string, unknown> | null = null
  if (!keepProfile?.rpps && deleteProfile?.rpps) {
    rppsUpdate = { rpps: deleteProfile.rpps }
    if (deleteProfile.nom) rppsUpdate.nom = deleteProfile.nom
    if (deleteProfile.prenom) rppsUpdate.prenom = deleteProfile.prenom
    if (deleteProfile.specialite) rppsUpdate.specialite = deleteProfile.specialite
    if (deleteProfile.mode_exercice) rppsUpdate.mode_exercice = deleteProfile.mode_exercice
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

  const { error: deleteAuthError } = await retryTransientAuth(() =>
    supabase.auth.admin.deleteUser(deleteId)
  )
  if (deleteAuthError) {
    console.error('[mergeAccounts] échec deleteUser auth:', deleteAuthError)
    return { ok: false, error: 'Erreur lors de la suppression du compte auth.' }
  }

  // Copier le RPPS (+ identité PSC) maintenant que le compte source est supprimé
  // (impossible avant : contrainte UNIQUE(users.rpps) — cf. commentaire plus haut).
  if (rppsUpdate) {
    await s.from('users').update(rppsUpdate).eq('id', keepId)
  }

  // Publier les évaluations en attente uniquement si le compte conservé a un RPPS
  // (identité PSC vérifiée — peut venir du compte source via fusion, ou déjà présent)
  const { data: keepRpps } = await s.from('users').select('rpps').eq('id', keepId).single()
  if ((keepRpps as { rpps?: string | null } | null)?.rpps) {
    await s.from('evaluations').update({ statut: 'publiee' }).eq('user_id', keepId).eq('statut', 'en_attente_psc')
  }

  // Garantir une solutions_utilisees pour chaque éval migrée (évals issues du flux
  // anonyme rattachées par PSC peuvent ne pas en avoir, sinon elles n'apparaissent
  // pas dans /mon-compte/mes-evaluations après fusion)
  for (const solutionId of migratedSolutionIds) {
    await ensureSolutionUtilisee(keepId, solutionId)
  }

  // Recalculer les scores pour toutes les solutions impactées par la migration
  for (const solutionId of migratedSolutionIds) {
    await recalcResultatsPourSolution(solutionId)
  }

  // Générer un magic link pour établir la session sur le compte conservé
  // Utiliser auth.users.email (pas public.users.email) — évite de créer un utilisateur fantôme
  // si l'email PSC synthétique diffère de public.users.email
  const { data: authUserData } = await retryTransientAuth(() =>
    supabase.auth.admin.getUserById(keepId)
  )
  const keepEmail = authUserData.user?.email
  if (!keepEmail) return { ok: false, error: 'Impossible de récupérer l\'email du compte conservé.' }

  const { data: linkData } = await retryTransientAuth(() =>
    supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: keepEmail,
    })
  )
  if (!linkData?.properties) return { ok: false, error: 'Erreur lors de la génération de la session.' }

  // Établir la session CÔTÉ SERVEUR : verifyOtp via le client SSR (adaptateur cookies),
  // de sorte que le cookie de session soit posé directement sur la réponse du Server Action.
  // Supprime le roundtrip client /auth/psc-session (qui perdait ~16 % des sessions au retour
  // de l'app mobile PSC) — même bascule que le flux standard dans psc-callback/route.ts.
  const ssr = await createServerClient()
  const { error: sessionError } = await retryTransientAuth(() =>
    ssr.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    })
  )
  if (sessionError) {
    console.error('[mergeAccounts] verifyOtp échec:', sessionError.message)
    return {
      ok: false,
      error: 'La fusion a été effectuée, mais la connexion automatique a échoué. Merci de vous reconnecter.',
    }
  }

  return { ok: true, redirectUrl: '/mon-compte/profil?fusion=ok' }
}
