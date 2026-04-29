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
    .or('statut.eq.publiee,statut.is.null') // Seulement les évaluations publiées (null = ancien, traité comme publiée)

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
    .or('statut.eq.publiee,statut.is.null')
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
      temps_precedente_solution,
      user:users(pseudo, portrait, specialite, mode_exercice)
    `, { count: 'exact' })
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null)
    .or('statut.eq.publiee,statut.is.null')
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
  const ancienUtilisateurs: Record<string, boolean> = {}
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
      ancienUtilisateurs[usage.user_id] = !!usage.date_fin
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
      moyenne: (() => {
        const m = row.moyenne_utilisateur as number | null
        if (m == null) return null
        // Si les scores sont ancien format, la moyenne stockée est sur 0-10
        const isNewFormat = Object.keys((row.scores as Record<string, unknown>) || {}).some((k) => k.startsWith('detail_'))
        return !isNewFormat && m > 5 ? Math.round((m / 2) * 10) / 10 : m
      })(),
      date: row.last_date_note as string | null,
      commentaire,
      dureeMois: (() => {
        // Priorité : temps_precedente_solution (années → mois)
        const tps = row.temps_precedente_solution as string | null
        if (tps && tps !== '-1') {
          if (tps === '3+') return 36
          const n = parseInt(tps, 10)
          if (!isNaN(n) && n > 0) return n * 12
        }
        // Fallback : calcul depuis solutions_utilisees
        return durations[userId] ?? null
      })(),
      ancienUtilisateur: ancienUtilisateurs[userId] ?? false,
      scores: (() => {
        const entries = Object.entries(scores).filter(([k]) => k !== 'commentaire')
        // Détecte l'ancien format Firebase par la présence de clés detail_*
        const isNewFormat = entries.some(([k]) => k.startsWith('detail_'))
        const divisor = isNewFormat ? 1 : 2
        return Object.fromEntries(
          entries.map(([k, v]) => [k, typeof v === 'number' && v > 0 ? Math.round((v / divisor) * 10) / 10 : null])
        ) as Record<string, number | null>
      })(),
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

// Maps each detail_* sub-criterion key to its critere_principal group
// Mapping sous-critères → critère majeur, utilisé UNIQUEMENT dans comparison.ts
// pour la vue détaillée de la page /comparer (logiciels métier uniquement, clés detail_*).
// Non utilisé dans le calcul de score (submitScores utilise les IDs de critères depuis la DB).
// Pour les catégories agenda/IA, leurs clés (agenda_*, docai_*, ias_*) sont absentes
// de cette map → la vue détaillée ne s'affiche pas pour ces catégories.
// Migration future : utiliser criteres.parent_id depuis la DB à la place.
export const DETAIL_CRITERE_MAP: Record<string, string> = {
  // Interface utilisateur
  detail_connexion: 'interface', detail_interface_generale: 'interface', detail_reactif: 'interface',
  detail_ins: 'interface', detail_atcd: 'interface', detail_notes_consultation: 'interface',
  detail_modeles_consultation: 'interface', detail_examens_visualisation: 'interface',
  detail_ordonnance_pharmacie: 'interface', detail_modeles_ordonnance: 'interface',
  detail_modeles_certificats: 'interface', detail_prescription_autres: 'interface',
  detail_pluripro: 'interface', detail_courrier_adressage: 'interface',
  detail_carnet_adresse: 'interface', detail_fse: 'interface', detail_mobilite: 'interface',
  detail_resultats_bio: 'interface', detail_profil_remplacant: 'interface',
  detail_prise_en_main: 'interface', detail_droits_acces: 'interface',
  // Fonctionnalités
  detail_agenda: 'fonctionnalites', detail_dmp_recuperation: 'fonctionnalites',
  detail_classement_docs: 'fonctionnalites', detail_ia_scribe: 'fonctionnalites',
  detail_examens_integration: 'fonctionnalites', detail_ordonnance_numerique: 'fonctionnalites',
  detail_signature_numerique: 'fonctionnalites', detail_envoi_dmp: 'fonctionnalites',
  detail_donnees_utiles_prescription: 'fonctionnalites', detail_alertes_ldap: 'fonctionnalites',
  detail_messagerie_interne: 'fonctionnalites', detail_staffs: 'fonctionnalites',
  detail_messagerie_securisee: 'fonctionnalites', detail_teleexpertise: 'fonctionnalites',
  detail_aati: 'fonctionnalites', detail_teleservices: 'fonctionnalites',
  detail_comptabilite: 'fonctionnalites', detail_teletransmission: 'fonctionnalites',
  detail_recherche_multicriteres: 'fonctionnalites',
  // Fiabilité (detail_nps excluded from scoring)
  detail_stabilite: 'fiabilite', detail_efficience: 'fiabilite',
  // Éditeur
  detail_pratiques_commerciales: 'editeur', detail_import_donnees: 'editeur',
  detail_sav: 'editeur', detail_communication: 'editeur', detail_hebergement: 'editeur',
  detail_maj: 'editeur', detail_formation: 'editeur', detail_ecoute_besoins: 'editeur',
  detail_resiliation: 'editeur',
  // Rapport qualité/prix
  detail_politique_tarifaire: 'qualite_prix', detail_rapport_qualite_prix: 'qualite_prix',
}

const CRITERES_PRINCIPAUX = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

/** Calcule la note par groupe de critères pour une évaluation individuelle. Renvoie null si aucune donnée. */
function computeEvalGroupAvg(scores: Record<string, unknown>): number | null {
  const vals: number[] = []
  for (const key of CRITERES_PRINCIPAUX) {
    const raw = scores[key]
    if (typeof raw === 'number' && raw > 0) vals.push(raw)
  }
  if (vals.length === 0) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

export async function getAverageNoteUtilisateurs(
  solutionId: string
): Promise<{ note: number | null; total: number; distribution: Record<string, number> }> {
  if (!UUID_RE.test(solutionId)) return { note: null, total: 0, distribution: {} }

  const supabase = createServiceRoleClient()

  // Étape 1 : IDs des 5 critères de notation — même filtre que getNotesUtilisateursGlobales
  // nom_capital IS NOT NULL identifie exactement les 5 critères majeurs, en excluant nps/synthese
  const { data: criteresMajeurs } = await supabase
    .from('criteres')
    .select('id')
    .not('nom_capital', 'is', null)
  const critereIds = (criteresMajeurs || []).map((c) => c.id)

  // Étape 2 : deux sources parallèles
  // - resultats (5 critères majeurs) → note globale (identique au listing/homepage)
  // - evaluations.moyenne_utilisateur → total + distribution par étoile
  const [evalsResult, resultatsResult] = await Promise.all([
    supabase
      .from('evaluations')
      .select('moyenne_utilisateur')
      .eq('solution_id', solutionId)
      .not('last_date_note', 'is', null)
      .or('statut.eq.publiee,statut.is.null')
      .not('moyenne_utilisateur', 'is', null),
    critereIds.length > 0
      ? supabase
          .from('resultats')
          .select('moyenne_utilisateurs_base5')
          .eq('solution_id', solutionId)
          .in('critere_id', critereIds)
          .not('moyenne_utilisateurs_base5', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const evalData = evalsResult.data
  if (!evalData || evalData.length === 0) return { note: null, total: 0, distribution: {} }

  // Note = moyenne des 5 critères majeurs depuis resultats (même calcul que listing/homepage)
  const critereNotes = (resultatsResult.data || []).map((r) => r.moyenne_utilisateurs_base5 as number)
  const note = critereNotes.length > 0
    ? Math.round((critereNotes.reduce((s, v) => s + v, 0) / critereNotes.length) * 10) / 10
    : null

  // Distribution par étoile calculée depuis les moyennes individuelles
  const total = evalData.length
  const distribution: Record<string, number> = {}
  for (const e of evalData) {
    const n = e.moyenne_utilisateur as number
    const bucket = String(Math.min(5, Math.max(1, Math.round(n))))
    distribution[bucket] = (distribution[bucket] || 0) + 1
  }

  return { note, total, distribution }
}

/**
 * Calcule les résultats agrégés directement depuis les évaluations.
 * Utilisé en fallback quand la table `resultats` est vide.
 * Gère les deux formats : ancien Firebase (0-10) et nouveau detail_* (0-5).
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
    .select('scores')
    .eq('solution_id', solutionId)
    .not('last_date_note', 'is', null)
    .or('statut.eq.publiee,statut.is.null')

  if (error || !evaluations || evaluations.length === 0) return []

  const results: ResultatWithCritere[] = []
  const allEvalAvgs: number[] = []

  // Moyennes par groupe de critères
  for (const [key, meta] of Object.entries(CRITERE_META)) {
    const groupValues: number[] = []

    for (const ev of evaluations) {
      const scores = (ev.scores || {}) as Record<string, unknown>
      const raw = scores[key]
      if (typeof raw === 'number' && raw > 0) {
        groupValues.push(raw)
      }
    }

    if (groupValues.length === 0) continue

    const avg = groupValues.reduce((sum, v) => sum + v, 0) / groupValues.length
    allEvalAvgs.push(avg)

    results.push({
      id: `computed-${key}`,
      solution_id: solutionId,
      critere_id: `computed-${key}`,
      moyenne_utilisateurs: avg,
      moyenne_utilisateurs_base5: avg,
      nb_notes: groupValues.length,
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
        id_categorie: null,
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
        reponse_max: null,
        reponse_min: null,
        reponse_type: null,
      },
    } as unknown as ResultatWithCritere)
  }

  // Synthèse globale : moyenne des moyennes par groupe
  if (allEvalAvgs.length > 0) {
    const overallAvg = allEvalAvgs.reduce((sum, v) => sum + v, 0) / allEvalAvgs.length

    results.push({
      id: 'computed-synthese',
      solution_id: solutionId,
      critere_id: 'computed-synthese',
      moyenne_utilisateurs: overallAvg,
      moyenne_utilisateurs_base5: overallAvg,
      nb_notes: evaluations.length,
      note_redac: null,
      note_redac_base5: null,
      avis_redac: null,
      notes: null,
      notes_critere: null,
      nps: null,
      repartition: null,
      critere: {
        id: 'computed-synthese',
        categorie_id: null,
        id_categorie: null,
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
        reponse_max: null,
        reponse_min: null,
        reponse_type: null,
      },
    } as unknown as ResultatWithCritere)
  }

  return results
}
