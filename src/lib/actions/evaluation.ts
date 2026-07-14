'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

interface CritereScore {
  id: string
  identifiantTech: string
  type: string // 'note', 'nps', etc.
  value: string | number
}

/**
 * Soumet les scores d'évaluation pour une solution.
 * Remplace : mutation setScoresSolution + updateEvaluation + updateResultats
 *
 * Logique métier clé :
 * 1. Stocke les scores de l'utilisateur dans `evaluations.scores` (JSONB)
 * 2. Pour chaque critère, met à jour le résultat agrégé dans `resultats`
 *    - Moyenne incrémentale : ((avg * n) - oldNote + newNote) / n
 *    - NPS : ((promoteurs/total) - (détracteurs/total)) * 100
 */
export async function submitScores(
  solutionId: string,
  step: string,
  criteres: CritereScore[]
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // 1. Mettre à jour l'évaluation utilisateur
  const { data: evalRows } = await supabase
    .from('evaluations')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const existingEval = evalRows && evalRows.length > 0 ? evalRows[0] : null
  const existingScores = (existingEval?.scores as Record<string, string | number> | null) ?? {}

  // Fusionner les nouveaux scores
  const updatedScores = { ...existingScores }
  for (const critere of criteres) {
    updatedScores[critere.identifiantTech] = critere.value
  }

  if (existingEval) {
    await supabase
      .from('evaluations')
      .update({
        scores: updatedScores,
        last_date_note: new Date().toISOString(),
      })
      .eq('id', existingEval.id)
  } else {
    await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores: updatedScores,
      last_date_note: new Date().toISOString(),
    })
  }

  // 2. Mettre à jour les résultats agrégés pour chaque critère
  for (const critere of criteres) {
    await updateResultat(solutionId, user.id, critere, existingScores)
  }

  // 3. Si step === 'general', recalculer la moyenne globale utilisateurs
  if (step === 'general') {
    await updateMoyenneGlobale(solutionId, user.id)
  }

  revalidatePath(`/solutions`)
  return { status: 'SUCCESS' }
}

/**
 * Crée une ligne solutions_utilisees pour (userId, solutionId) si elle n'existe pas.
 * Utilisé après rattachement d'évals anonymes pour qu'elles apparaissent dans
 * /mon-compte/mes-evaluations (qui itère sur solutions_utilisees).
 */
export async function ensureSolutionUtilisee(userId: string, solutionId: string) {
  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .limit(1)
  if (existing && existing.length > 0) return
  await supabase.from('solutions_utilisees').insert({
    user_id: userId,
    solution_id: solutionId,
    statut_evaluation: 'finalisee',
    date_debut: new Date().toISOString().split('T')[0],
  })
}

/**
 * Date de mise en ligne du nouveau site Supabase.
 * Les évaluations créées avant cette date sont considérées comme migrées Firebase
 * et sont déjà incluses dans l'ancrage (`resultats.firebase_moyenne_base5`).
 * Les évaluations créées après contribuent incrémentalement au calcul.
 */
const DATE_MISE_EN_LIGNE = '2026-04-12T00:00:00Z'

/**
 * Recalcule les résultats agrégés d'une solution depuis les évaluations publiées.
 * Seules les évaluations statut='publiee' sont prises en compte.
 *
 * Deux modes selon `solutions.is_firebase_legacy` :
 *
 * - Solutions Firebase legacy : mode incrémental. La référence figée est dans
 *   `resultats.firebase_moyenne_base5` (× `firebase_nb_notes`). Seules les évaluations
 *   post-mise en ligne (`created_at >= DATE_MISE_EN_LIGNE`) s'agrègent par-dessus.
 *   Garantit que la note historique Firebase reste l'ancrage et qu'une nouvelle
 *   évaluation déplace doucement la moyenne sans tout recalculer.
 *
 * - Autres solutions : full recalc depuis toutes les évaluations publiées
 *   (le comportement d'origine).
 */
export async function recalcResultatsPourSolution(solutionId: string) {
  const supabase = createServiceRoleClient()

  // Mode legacy ?
  const { data: solRow } = await supabase
    .from('solutions')
    .select('is_firebase_legacy')
    .eq('id', solutionId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isLegacy = (solRow as any)?.is_firebase_legacy === true

  const { data: criteres } = await supabase
    .from('criteres')
    .select('id, identifiant_tech')
    .not('identifiant_tech', 'is', null)
  if (!criteres || criteres.length === 0) return

  // En mode legacy, on ne prend que les évaluations post-mise en ligne.
  // En mode non-legacy, on prend toutes les évaluations publiées (comportement d'origine).
  let evalQuery = supabase
    .from('evaluations')
    .select('scores, user_id, created_at, moyenne_utilisateur')
    .eq('solution_id', solutionId)
    .eq('statut', 'publiee')
    // Une note n'est comptabilisée que finalisée pour le calcul : moyenne posée
    // (= 5 critères principaux remplis). Écarte les brouillons partiels qui héritent
    // du DEFAULT statut='publiee'. Cf docs/2026-04-26-evaluation-scoring.md.
    .not('moyenne_utilisateur', 'is', null)
  if (isLegacy) {
    evalQuery = evalQuery.gte('created_at', DATE_MISE_EN_LIGNE)
  }
  const { data: evaluations } = await evalQuery

  if (!isLegacy && (!evaluations || evaluations.length === 0)) {
    // Solution non-legacy sans évaluation : remise à zéro classique
    await supabase
      .from('resultats')
      .update({ notes: {}, nb_notes: 0, moyenne_utilisateurs: null, moyenne_utilisateurs_base5: null })
      .eq('solution_id', solutionId)
    revalidatePath('/solutions', 'layout')
    return
  }

  for (const critere of criteres) {
    const key = critere.identifiant_tech as string
    const notes: Record<string, number> = {}

    for (const evRow of evaluations ?? []) {
      const raw = (evRow.scores as Record<string, unknown> | null)?.[key]
      const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
      // Un score `0` = critère **non noté / NC** (le formulaire exige > 0 pour une note valide)
      // → exclu de l'agrégation, sinon il tire la moyenne du critère vers le bas (cf. décision 2026-07-13).
      if (!isNaN(num) && num > 0 && evRow.user_id) notes[evRow.user_id] = num
    }

    if (isLegacy) {
      // Mode legacy : moyenne pondérée ancrage Firebase + notes post-lancement
      const { data: existing } = await supabase
        .from('resultats')
        .select('id, firebase_moyenne_base5, firebase_nb_notes')
        .eq('solution_id', solutionId)
        .eq('critere_id', critere.id)
        .maybeSingle()
      if (!existing) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fbMoy = (existing as any).firebase_moyenne_base5 as number | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fbNb = (existing as any).firebase_nb_notes as number | null

      const nbPost = Object.keys(notes).length
      const sommePost = Object.values(notes).reduce((s, v) => s + v, 0)

      // Si pas d'ancrage Firebase pour ce critère (cas rare : critère sans données Firebase),
      // on retombe sur le calcul classique des notes post-lancement uniquement.
      let nouvelleMoyenne: number | null
      let nouveauNbNotes: number
      // Ancrage Firebase à 0 = **pas** de note historique réelle (l'ancien site n'avait pas de
      // note pour ce critère) → traité comme « non noté », pas comme un vrai 0.
      if (fbMoy != null && fbMoy > 0 && fbNb != null && fbNb > 0) {
        nouveauNbNotes = fbNb + nbPost
        nouvelleMoyenne = nouveauNbNotes > 0
          ? Math.round(((fbMoy * fbNb + sommePost) / nouveauNbNotes) * 100) / 100
          : null
      } else if (nbPost > 0) {
        nouveauNbNotes = nbPost
        nouvelleMoyenne = Math.round((sommePost / nbPost) * 100) / 100
      } else {
        // Ni ancrage valide ni note post-lancement > 0 → critère « non noté » (NC).
        nouvelleMoyenne = null
        nouveauNbNotes = 0
      }

      await supabase
        .from('resultats')
        .update({
          notes,
          nb_notes: nouveauNbNotes,
          moyenne_utilisateurs: nouvelleMoyenne,
          moyenne_utilisateurs_base5: nouvelleMoyenne,
        })
        .eq('id', existing.id)
    } else {
      // Mode classique (non-legacy) : moyenne directe depuis evaluations
      const nbNotes = Object.keys(notes).length
      if (nbNotes === 0) {
        // Aucune note valide (> 0) → remettre le critère en « non noté » (évite un 0 fantôme figé).
        await supabase
          .from('resultats')
          .update({ notes: {}, nb_notes: 0, moyenne_utilisateurs: null, moyenne_utilisateurs_base5: null })
          .eq('solution_id', solutionId)
          .eq('critere_id', critere.id)
        continue
      }
      const moyenne = Math.round(
        (Object.values(notes).reduce((s, v) => s + v, 0) / nbNotes) * 100
      ) / 100

      const payload = {
        solution_id: solutionId,
        critere_id: critere.id,
        notes,
        nb_notes: nbNotes,
        moyenne_utilisateurs: moyenne,
        moyenne_utilisateurs_base5: moyenne,
      }

      const { data: existing } = await supabase
        .from('resultats')
        .select('id')
        .eq('solution_id', solutionId)
        .eq('critere_id', critere.id)
        .maybeSingle()

      if (existing) {
        await supabase.from('resultats').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('resultats').insert(payload)
      }
    }
  }

  // ─── Mise à jour de la ligne `type='moyenne'` (note globale) ───
  // Pas couverte par la boucle ci-dessus car identifiant_tech IS NULL pour cette ligne.
  const { data: critereMoyenne } = await supabase
    .from('criteres')
    .select('id')
    .eq('type', 'moyenne')
    .maybeSingle()

  if (critereMoyenne?.id) {
    const { data: ligneMoyenne } = await supabase
      .from('resultats')
      .select('id, firebase_moyenne_base5, firebase_nb_notes')
      .eq('solution_id', solutionId)
      .eq('critere_id', critereMoyenne.id)
      .maybeSingle()

    // moyenne_utilisateur des évaluations post-lancement (legacy) ou de toutes (non-legacy)
    const moyennesPost: number[] = (evaluations ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e) => (e as any).moyenne_utilisateur as number | null | undefined)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const sommePost = moyennesPost.reduce((s, v) => s + v, 0)
    const nbPost = moyennesPost.length

    let nouvelleMoyenne: number | null = null
    let nouveauNb = 0

    if (isLegacy && ligneMoyenne) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fbMoy = (ligneMoyenne as any).firebase_moyenne_base5 as number | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fbNb = (ligneMoyenne as any).firebase_nb_notes as number | null
      if (fbMoy != null && fbNb != null && fbNb > 0) {
        nouveauNb = fbNb + nbPost
        nouvelleMoyenne = nouveauNb > 0
          ? Math.round(((fbMoy * fbNb + sommePost) / nouveauNb) * 100) / 100
          : null
      } else if (nbPost > 0) {
        nouveauNb = nbPost
        nouvelleMoyenne = Math.round((sommePost / nbPost) * 100) / 100
      }
    } else if (!isLegacy && nbPost > 0) {
      nouveauNb = nbPost
      nouvelleMoyenne = Math.round((sommePost / nbPost) * 100) / 100
    }

    if (nouvelleMoyenne != null) {
      if (ligneMoyenne) {
        await supabase
          .from('resultats')
          .update({
            moyenne_utilisateurs: nouvelleMoyenne,
            moyenne_utilisateurs_base5: nouvelleMoyenne,
            nb_notes: nouveauNb,
          })
          .eq('id', ligneMoyenne.id)
      } else if (!isLegacy) {
        // Pour une solution non-legacy sans ligne moyenne préexistante, on la crée
        await supabase.from('resultats').insert({
          solution_id: solutionId,
          critere_id: critereMoyenne.id,
          moyenne_utilisateurs: nouvelleMoyenne,
          moyenne_utilisateurs_base5: nouvelleMoyenne,
          nb_notes: nouveauNb,
        })
      }
    }
  }

  revalidatePath('/solutions', 'layout')
}

/**
 * Met à jour un résultat agrégé pour un critère.
 * @deprecated Remplacé par recalcResultatsPourSolution (full recalc, filtre statut='publiee').
 * Conservé pour compatibilité avec submitScores().
 */
async function updateResultat(
  solutionId: string,
  userId: string,
  critere: CritereScore,
  existingScores: Record<string, string | number>
) {
  const supabase = await createServerClient()

  // Chercher le résultat existant
  const { data: resultat } = await supabase
    .from('resultats')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('critere_id', critere.id)
    .single()

  const notes = (resultat?.notes as Record<string, number>) || {}
  const oldNote = notes[userId]
  const newNote = typeof critere.value === 'string' ? parseFloat(critere.value) : critere.value

  if (isNaN(newNote)) return

  notes[userId] = newNote
  const nbNotes = Object.keys(notes).length

  if (critere.type === 'nps') {
    // Calcul NPS
    const repartition = (resultat?.repartition as Record<string, number>) || {}

    // Retirer l'ancienne valeur de la répartition
    if (oldNote !== undefined) {
      const oldKey = String(oldNote)
      if (repartition[oldKey]) repartition[oldKey]--
    }

    // Ajouter la nouvelle valeur
    const newKey = String(newNote)
    repartition[newKey] = (repartition[newKey] || 0) + 1

    // Calculer le NPS : ((promoteurs/total) - (détracteurs/total)) * 100
    const total = Object.values(repartition).reduce((sum, v) => sum + v, 0)
    let promoteurs = 0
    let detracteurs = 0

    for (const [score, count] of Object.entries(repartition)) {
      const s = parseInt(score)
      if (s >= 9) promoteurs += count
      else if (s <= 6) detracteurs += count
    }

    const nps = total > 0 ? ((promoteurs / total) - (detracteurs / total)) * 100 : 0

    const updateData = {
      solution_id: solutionId,
      critere_id: critere.id,
      notes,
      nb_notes: nbNotes,
      nps: Math.round(nps * 100) / 100,
      repartition,
    }

    if (resultat) {
      await supabase.from('resultats').update(updateData).eq('id', resultat.id)
    } else {
      await supabase.from('resultats').insert(updateData)
    }
  } else {
    // Calcul de la moyenne incrémentale pour les notes classiques
    let moyenne: number

    if (resultat && oldNote !== undefined) {
      // Mise à jour : ((avg * n) - oldNote + newNote) / n
      const currentMoyenne = resultat.moyenne_utilisateurs || 0
      moyenne = ((currentMoyenne * nbNotes) - oldNote + newNote) / nbNotes
    } else if (resultat) {
      // Nouvelle note : ((avg * (n-1)) + newNote) / n
      const currentMoyenne = resultat.moyenne_utilisateurs || 0
      const previousN = nbNotes - 1
      moyenne = previousN > 0 ? ((currentMoyenne * previousN) + newNote) / nbNotes : newNote
    } else {
      moyenne = newNote
    }

    // Conversion en base 5 (si la note est sur 10)
    const moyenneBase5 = Math.round((moyenne / 2) * 100) / 100

    const updateData = {
      solution_id: solutionId,
      critere_id: critere.id,
      notes,
      nb_notes: nbNotes,
      moyenne_utilisateurs: Math.round(moyenne * 100) / 100,
      moyenne_utilisateurs_base5: moyenneBase5,
    }

    if (resultat) {
      await supabase.from('resultats').update(updateData).eq('id', resultat.id)
    } else {
      await supabase.from('resultats').insert(updateData)
    }
  }
}

/**
 * Recalcule la moyenne globale des utilisateurs pour une solution.
 * Remplace : updateMoyenneUtilisateursResultat
 */
async function updateMoyenneGlobale(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  // Récupérer l'évaluation de l'utilisateur
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('scores')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (!evaluation?.scores) return

  const scores = evaluation.scores as Record<string, string | number>
  const numericScores = Object.values(scores)
    .map((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .filter((v) => !isNaN(v))

  if (numericScores.length === 0) return

  const moyenne =
    numericScores.reduce((sum, v) => sum + v, 0) / numericScores.length

  await supabase
    .from('evaluations')
    .update({ moyenne_utilisateur: Math.round(moyenne * 100) / 100 })
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
}

/**
 * Initialise une session d'évaluation.
 * Remplace : mutation setupEvaluation
 */
export async function setupEvaluation(
  solutionId: string,
  categorieId: string,
  timeUsed: string,
  solutionPrecedenteId?: string
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Créer ou mettre à jour la solution utilisée
  const { data: existing } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      statut_evaluation: 'instanciee',
      date_debut: new Date().toISOString().split('T')[0],
      solution_precedente_id: solutionPrecedenteId || null,
    })
  }

  // Créer l'évaluation si elle n'existe pas
  const { data: existingEval } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (!existingEval) {
    await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores: {},
      temps_precedente_solution: timeUsed,
    })
  }

  return { status: 'SUCCESS' }
}


/**
 * Reconfirme une évaluation en un clic (remet last_date_note à maintenant,
 * réinitialise les compteurs de relance).
 */
export async function reconfirmerEvaluation(solutionId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('evaluations')
    .update({
      last_date_note: new Date().toISOString(),
      last_relance_sent_at: null,
      relance_count: 0,
    })
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/mon-compte/mes-evaluations')
  return { status: 'SUCCESS' }
}

// Les 5 critères principaux = condition minimale pour qu'une note soit valide
// et comptabilisée (cf docs/2026-04-26-evaluation-scoring.md, « Cycle de vie & comptabilisation »).
const CRITERES_PRINCIPAUX = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix'] as const

/**
 * Moyenne (base 5) des 5 critères principaux si TOUS sont présents et > 0.
 * Retourne null sinon → la note n'est pas encore valide pour le calcul.
 */
function moyenneCriteresPrincipaux(scores: Record<string, number | string | null>): number | null {
  const vals: number[] = []
  for (const k of CRITERES_PRINCIPAUX) {
    const raw = scores[k]
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
    if (isNaN(n) || n <= 0) return null
    vals.push(n)
  }
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

/**
 * Sauvegarde un brouillon d'évaluation (scores partiels).
 * Appelé silencieusement à chaque navigation entre étapes.
 *
 * Règle clé : dès que les 5 critères principaux sont remplis, la note devient
 * **valide et comptabilisée** (moyenne_utilisateur + last_date_note posées,
 * resultats recalculés), même si l'utilisateur ferme le navigateur ensuite.
 * Elle reste affichée « À compléter » dans son compte (statut_evaluation =
 * 'aCompleter') tant qu'il n'a pas finalisé les sous-critères via submitEvaluation.
 */
export async function saveDraftEvaluation(
  solutionId: string,
  scores: Record<string, number | string | null>
) {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return

  const supabase = createServiceRoleClient()

  const moyenne = moyenneCriteresPrincipaux(scores)
  const estValide = moyenne != null

  // ── solutions_utilisees : suivi de complétude côté utilisateur ──
  const { data: existingSU } = await supabase
    .from('solutions_utilisees')
    .select('id, statut_evaluation')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const su = existingSU?.[0]
  // L'éval « devient » à compléter (5 critères principaux atteints) la 1re fois seulement :
  // soit nouvelle, soit promue depuis 'instanciee' (jamais re-loggée si déjà aCompleter/finalisee).
  const devientACompleter = estValide && (!su || (su.statut_evaluation !== 'finalisee' && su.statut_evaluation !== 'aCompleter'))
  if (!su) {
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      // 'aCompleter' = comptée mais sous-critères non finalisés ; sinon 'instanciee'.
      statut_evaluation: estValide ? 'aCompleter' : 'instanciee',
      date_debut: new Date().toISOString().split('T')[0],
    })
  } else if (estValide && su.statut_evaluation !== 'finalisee') {
    // Promotion vers 'aCompleter' (ne jamais rétrograder une éval finalisée).
    await supabase
      .from('solutions_utilisees')
      .update({ statut_evaluation: 'aCompleter' })
      .eq('id', su.id)
  }

  // ── evaluations : scores + finalisation du calcul si les 5 principaux sont là ──
  const finalisationCalc = estValide
    ? { moyenne_utilisateur: moyenne, last_date_note: new Date().toISOString() }
    : {}

  const { data: existingEval } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  if (!existingEval || existingEval.length === 0) {
    await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores,
      ...finalisationCalc,
    })
  } else {
    await supabase
      .from('evaluations')
      .update({ scores, ...finalisationCalc })
      .eq('solution_id', solutionId)
      .eq('user_id', user.id)
  }

  // Traitements lourds déportés APRÈS la réponse via after() : recalcul des agrégats et
  // journal admin. Les scores sont déjà persistés ci-dessus — on priorise l'écriture et on
  // libère vite la réponse (sauvegarde silencieuse appelée à chaque étape / au beforeunload).
  // La note reste comptabilisée (agrégats à jour) quelques instants après, en arrière-plan.
  after(async () => {
    try {
      if (estValide) {
        await recalcResultatsPourSolution(solutionId)
      }

      // Flux de supervision admin : éval « à compléter » (5 critères principaux, sous-critères en attente)
      if (devientACompleter) {
        const [{ data: u }, { data: sol }] = await Promise.all([
          supabase.from('users').select('prenom, nom, pseudo').eq('id', user.id).single(),
          supabase.from('solutions').select('nom').eq('id', solutionId).single(),
        ])
        await logActivity({
          type: ACTIVITY_TYPES.EVALUATION_A_COMPLETER,
          acteurType: 'medecin',
          acteurId: user.id,
          acteurLabel: u?.pseudo || [u?.prenom, u?.nom].filter(Boolean).join(' ') || null,
          cibleType: 'solution',
          cibleId: solutionId,
          cibleLabel: sol?.nom ?? null,
          diff: moyenne != null ? { note: { avant: null, apres: moyenne } } : null,
        })
      }
    } catch (e) {
      console.error('[saveDraftEvaluation] post-traitement échoué (ignoré):', e)
    }
  })
}

/**
 * Soumet une évaluation complète pour une solution (formulaire simplifié).
 * Utilise le service role pour bypasser le RLS.
 */
export async function submitEvaluation(
  solutionId: string,
  scores: Record<string, number | string | null>,
  moyenne: number,
  dateDebut?: string | null,
  dateFin?: string | null
) {
  // Vérifier l'authentification via le server client (avec cookies)
  const authClient = await createServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Utiliser le service role pour les écritures (bypass RLS)
  const supabase = createServiceRoleClient()

  // S'assurer que le profil utilisateur existe dans public.users
  const { data: profile } = await supabase
    .from('users')
    .select('id, rpps')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
    })
  }

  const statut = profile?.rpps ? 'publiee' : 'en_attente_psc'

  // Vérifier si une évaluation existe déjà
  const { data: existingEvals } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const existingEval = existingEvals?.[0]

  // Gérer la solution_utilisee (créer ou mettre à jour)
  const { data: existingSU } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  if (!existingSU || existingSU.length === 0) {
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      statut_evaluation: 'finalisee',
      date_debut: dateDebut || new Date().toISOString().split('T')[0],
      date_fin: dateFin || null,
    })
  } else {
    await supabase
      .from('solutions_utilisees')
      .update({
        statut_evaluation: 'finalisee',
        ...(dateDebut ? { date_debut: dateDebut } : {}),
        date_fin: dateFin || null,
      })
      .eq('id', existingSU[0].id)
  }

  if (existingEval) {
    const { error } = await supabase
      .from('evaluations')
      .update({
        scores,
        moyenne_utilisateur: Math.round(moyenne * 100) / 100,
        last_date_note: new Date().toISOString(),
        statut,
      })
      .eq('id', existingEval.id)
    if (error) throw new Error(error.message)
  } else {
    // Créer l'évaluation
    const { error } = await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores,
      moyenne_utilisateur: Math.round(moyenne * 100) / 100,
      last_date_note: new Date().toISOString(),
      statut,
    })
    if (error) throw new Error(error.message)
  }

  // Traitements lourds déportés APRÈS la réponse via after() : recalcul des agrégats
  // (dizaines de requêtes séquentielles), journal admin et revalidation. L'évaluation
  // est déjà persistée ci-dessus — ces étapes n'impactent que l'affichage public des
  // moyennes. Les garder synchrones bloquait le client (spinner « dans le vide »), voire
  // dépassait le timeout serverless → promesse jamais résolue. cf docs/2026-04-26-evaluation-scoring.md.
  after(async () => {
    try {
      if (statut === 'publiee') {
        await recalcResultatsPourSolution(solutionId)
      }

      // Flux de supervision admin : nouvelle évaluation (création uniquement, pas les mises à jour)
      if (!existingEval) {
        const [{ data: u }, { data: sol }] = await Promise.all([
          supabase.from('users').select('prenom, nom, pseudo').eq('id', user.id).single(),
          supabase.from('solutions').select('nom').eq('id', solutionId).single(),
        ])
        await logActivity({
          type: statut === 'publiee'
            ? ACTIVITY_TYPES.EVALUATION_PUBLIEE
            : ACTIVITY_TYPES.EVALUATION_EN_ATTENTE_PSC,
          acteurType: 'medecin',
          acteurId: user.id,
          acteurLabel: u?.pseudo || [u?.prenom, u?.nom].filter(Boolean).join(' ') || null,
          cibleType: 'solution',
          cibleId: solutionId,
          cibleLabel: sol?.nom ?? null,
          diff: { note: { avant: null, apres: Math.round(moyenne * 100) / 100 } },
        })
      }

      revalidatePath('/solutions')
    } catch (e) {
      console.error('[submitEvaluation] post-traitement échoué (ignoré):', e)
    }
  })

  return { status: 'SUCCESS' }
}

/**
 * Soumet une évaluation pour un utilisateur anonyme (non connecté).
 * L'évaluation reste en attente jusqu'à vérification PSC.
 */
export async function submitEvaluationAnonyme(
  solutionId: string,
  scores: Record<string, number | string | null>,
  moyenne: number,
  emailTemp: string,
  dateDebut?: string | null,
  dateFin?: string | null
) {
  const supabase = createServiceRoleClient()
  const tokenVerification = randomUUID()
  const emailNormalise = emailTemp.toLowerCase().trim()

  // Vérifier si une évaluation en attente existe déjà pour cet email + solution
  const { data: existing } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('email_temp', emailNormalise)
    .eq('statut', 'en_attente_psc')
    .limit(1)

  const scoresFinaux: Record<string, number | string | null> = { ...scores }
  if (dateDebut) scoresFinaux.date_debut = dateDebut
  if (dateFin) scoresFinaux.date_fin = dateFin

  if (existing && existing.length > 0) {
    // Mettre à jour l'évaluation existante en attente
    await supabase
      .from('evaluations')
      .update({
        scores: scoresFinaux,
        moyenne_utilisateur: Math.round(moyenne * 100) / 100,
        last_date_note: new Date().toISOString(),
        token_verification: tokenVerification,
      })
      .eq('id', existing[0].id)
  } else {
    const { error } = await supabase.from('evaluations').insert({
      solution_id: solutionId,
      scores: scoresFinaux,
      moyenne_utilisateur: Math.round(moyenne * 100) / 100,
      last_date_note: new Date().toISOString(),
      statut: 'en_attente_psc',
      email_temp: emailNormalise,
      token_verification: tokenVerification,
    })
    if (error) throw new Error(error.message)
  }

  // Récupérer le template email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'verification_psc')
    .single()

  const headersList = await headers()
  const host = headersList.get('host') || 'www.100000medecins.org'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = `${proto}://${host}`
  const pscLink = `${siteUrl}/api/auth/psc-initier?token=${tokenVerification}`

  const sujet = template?.sujet || 'Validez votre évaluation sur 100 000 Médecins'
  const contenuHtml = (template?.contenu_html || '')
    .replace(/https?:\/\/(?:www\.)?100000medecins\.org/g, siteUrl)
    .replace(/\{\{psc_link\}\}/g, pscLink)

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  await sgMail.send({
    to: emailTemp,
    from: EMAIL_SENDER,
    subject: sujet,
    html: contenuHtml,
  })

  return { status: 'SUCCESS' }
}
