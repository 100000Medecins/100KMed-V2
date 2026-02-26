import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Evaluation, AvisUtilisateursResult, ResultatWithCritere } from '@/types/models'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Récupère l'évaluation d'un utilisateur pour une solution.
 * Remplace : fetchEvaluation
 */
export async function getEvaluation(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data as Evaluation | null
}

/**
 * Récupère les avis utilisateurs paginés pour une solution.
 * Remplace : fetchAvisUtilisateurs
 *
 * Utilise une pagination par curseur (ID de la dernière évaluation lue).
 */
export async function getAvisUtilisateurs(
  solutionId: string,
  categorieId: string,
  options: {
    critereTri?: string
    limit: number
    sensLecture?: 'next' | 'prev'
    idLastEvaluationRead?: string
    idFirstEvaluationRead?: string
  }
): Promise<AvisUtilisateursResult> {
  const supabase = await createServerClient()

  let query = supabase
    .from('evaluations')
    .select(`
      id,
      user_id,
      scores,
      moyenne_utilisateur,
      last_date_note,
      user:users(pseudo, portrait, specialite, mode_exercice)
    `)
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null) // Seulement les évaluations finalisées

  // Tri
  if (options.critereTri === 'date') {
    query = query.order('last_date_note', { ascending: false })
  } else if (options.critereTri === 'note') {
    query = query.order('moyenne_utilisateur', { ascending: false })
  } else {
    query = query.order('last_date_note', { ascending: false })
  }

  // Pagination par curseur
  if (options.sensLecture === 'next' && options.idLastEvaluationRead) {
    query = query.gt('id', options.idLastEvaluationRead)
  } else if (options.sensLecture === 'prev' && options.idFirstEvaluationRead) {
    query = query.lt('id', options.idFirstEvaluationRead)
  }

  query = query.limit(options.limit)

  const { data, error } = await query

  if (error) throw error

  const avis = (data || []).map((row: Record<string, unknown>) => ({
    idEvaluation: row.id as string,
    idUser: row.user_id as string,
    user: row.user as { pseudo: string | null; portrait: string | null; specialite: string | null; mode_exercice: string | null } | null ?? undefined,
    lastDateNote: row.last_date_note as string | null,
  }))

  return {
    avis,
    idLastEvaluationRead: avis.length > 0 ? avis[avis.length - 1].idEvaluation : undefined,
    idFirstEvaluationRead: avis.length > 0 ? avis[0].idEvaluation : undefined,
  }
}

/**
 * Récupère les derniers avis utilisateurs (sans pagination).
 * Remplace : fetchLastAvisUtilisateurs
 */
export async function getLastAvisUtilisateurs(
  solutionId: string,
  limit: number = 5
) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('evaluations')
    .select(`
      id,
      user_id,
      scores,
      moyenne_utilisateur,
      last_date_note,
      user:users(pseudo, portrait, specialite, mode_exercice)
    `)
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null)
    .order('last_date_note', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as unknown as Array<{
    id: string
    user_id: string | null
    scores: unknown
    moyenne_utilisateur: number | null
    last_date_note: string | null
    user: { pseudo: string | null; portrait: string | null; specialite: string | null; mode_exercice: string | null } | null
  }>
}

/**
 * Récupère les avis utilisateurs avec pagination offset + count total.
 * Utilisé par le composant ConfrereTestimonials pour l'affichage paginé.
 */
export async function getAvisUtilisateursPaginated(
  solutionId: string,
  options: {
    page: number
    limit: number
    tri?: 'date' | 'note'
  }
) {
  // evaluations.solution_id est UUID — retourner vide si l'ID n'est pas un UUID
  if (!UUID_RE.test(solutionId)) return { avis: [], total: 0, page: options.page, totalPages: 0 }

  const supabase = createServiceRoleClient()
  const { page, limit, tri = 'date' } = options
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('evaluations')
    .select(`
      id,
      user_id,
      scores,
      moyenne_utilisateur,
      last_date_note,
      user:users(pseudo, portrait, specialite, mode_exercice)
    `, { count: 'exact' })
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null)
    .order(tri === 'note' ? 'moyenne_utilisateur' : 'last_date_note', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  // Fetch durations for all users in parallel
  const userIds = (data || [])
    .map((r: Record<string, unknown>) => r.user_id as string)
    .filter(Boolean)

  const durations: Record<string, number | null> = {}
  if (userIds.length > 0) {
    const { data: usageData } = await supabase
      .from('solutions_utilisees')
      .select('user_id, date_debut, date_fin')
      .eq('solution_id', solutionId)
      .in('user_id', userIds)

    for (const usage of usageData || []) {
      if (!usage.date_debut || !usage.user_id) continue
      const debut = new Date(usage.date_debut)
      const fin = usage.date_fin ? new Date(usage.date_fin) : new Date()
      const months = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth())
      durations[usage.user_id] = months
    }
  }

  type UserRow = { pseudo: string | null; portrait: string | null; specialite: string | null; mode_exercice: string | null }

  const avis = (data || []).map((row: Record<string, unknown>) => {
    const scores = (row.scores || {}) as Record<string, unknown>
    const commentaire = typeof scores.commentaire === 'string' ? scores.commentaire : null
    const userId = row.user_id as string

    return {
      id: row.id as string,
      userId,
      user: row.user as UserRow | null,
      moyenne: row.moyenne_utilisateur as number | null,
      date: row.last_date_note as string | null,
      commentaire,
      dureeMois: durations[userId] ?? null,
      scores: Object.fromEntries(
        Object.entries(scores).filter(([k]) => k !== 'commentaire')
      ) as Record<string, number | null>,
    }
  })

  return { avis, total, page, totalPages }
}

/**
 * Récupère la durée d'utilisation d'une solution par un utilisateur.
 * Remplace : fetchDureeUtilisationSolution
 */
export async function getDureeUtilisationSolution(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('solutions_utilisees')
    .select('date_debut, date_fin')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data || !data.date_debut) return null

  // Calculer la durée en mois
  const debut = new Date(data.date_debut)
  const fin = data.date_fin ? new Date(data.date_fin) : new Date()
  const diffMonths =
    (fin.getFullYear() - debut.getFullYear()) * 12 +
    (fin.getMonth() - debut.getMonth())

  return diffMonths
}

/**
 * Calcule les résultats agrégés directement depuis les évaluations.
 * Utilisé en fallback quand la table `resultats` est vide.
 */
const CRITERE_META: Record<string, { nom_court: string; type: string }> = {
  interface: { nom_court: 'Interface utilisateur', type: 'detail' },
  fonctionnalites: { nom_court: 'Fonctionnalités', type: 'detail' },
  fiabilite: { nom_court: 'Fiabilité', type: 'detail' },
  editeur: { nom_court: 'Éditeur', type: 'detail' },
  qualite_prix: { nom_court: 'Rapport qualité/prix', type: 'detail' },
}

export async function computeAggregatedResultats(
  solutionId: string
): Promise<ResultatWithCritere[]> {
  if (!UUID_RE.test(solutionId)) return []

  const supabase = createServiceRoleClient()

  const { data: evaluations, error } = await supabase
    .from('evaluations')
    .select('scores, moyenne_utilisateur')
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null)

  if (error || !evaluations || evaluations.length === 0) return []

  const results: ResultatWithCritere[] = []

  // Moyennes par critère
  for (const [key, meta] of Object.entries(CRITERE_META)) {
    const values = evaluations
      .map((e) => (e.scores as Record<string, number | null>)?.[key])
      .filter((v): v is number => typeof v === 'number' && v > 0)

    if (values.length === 0) continue

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length

    results.push({
      id: `computed-${key}`,
      solution_id: solutionId,
      critere_id: `computed-${key}`,
      moyenne_utilisateurs: avg,
      moyenne_utilisateurs_base5: avg,
      nb_notes: values.length,
      note_redac: null,
      note_redac_base5: null,
      avis_redac: null,
      notes: null,
      notes_critere: null,
      nps: null,
      repartition: null,
      critere: {
        id: `computed-${key}`,
        categorie_id: null,
        type: meta.type,
        nom_court: meta.nom_court,
        nom_long: meta.nom_court,
        identifiant_tech: key,
        identifiant_bis: null,
        information: null,
        is_actif: true,
        is_enfant: false,
        is_parent: false,
        nom_capital: null,
        ordre: null,
        parent_id: null,
        question: null,
        reponse: null,
      },
    } as ResultatWithCritere)
  }

  // Synthèse globale
  const moyennes = evaluations
    .map((e) => e.moyenne_utilisateur as number)
    .filter((v): v is number => v != null)

  if (moyennes.length > 0) {
    const overallAvg = moyennes.reduce((sum, v) => sum + v, 0) / moyennes.length

    const repartition: Record<string, number> = {}
    for (const m of moyennes) {
      const rounded = String(Math.round(m))
      repartition[rounded] = (repartition[rounded] || 0) + 1
    }

    results.push({
      id: 'computed-synthese',
      solution_id: solutionId,
      critere_id: 'computed-synthese',
      moyenne_utilisateurs: overallAvg,
      moyenne_utilisateurs_base5: overallAvg,
      nb_notes: moyennes.length,
      note_redac: null,
      note_redac_base5: null,
      avis_redac: null,
      notes: null,
      notes_critere: null,
      nps: null,
      repartition,
      critere: {
        id: 'computed-synthese',
        categorie_id: null,
        type: 'synthese',
        nom_court: 'Note globale',
        nom_long: 'Note globale',
        identifiant_tech: 'synthese',
        identifiant_bis: null,
        information: null,
        is_actif: true,
        is_enfant: false,
        is_parent: false,
        nom_capital: null,
        ordre: null,
        parent_id: null,
        question: null,
        reponse: null,
      },
    } as ResultatWithCritere)
  }

  return results
}
