'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import { revalidatePath } from 'next/cache'
import { revalidateSolution, revalidateSolutionById } from '@/lib/revalidate-solution'
import { SCORES_META_KEYS } from '@/lib/constants/criteres'
import { after } from 'next/server'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'
import { datesUtilisationDeclarees } from '@/lib/duree-utilisation'

type ScoresRecord = Record<string, unknown>

/**
 * Vrai si AUCUNE note n'a changé entre deux jeux de `scores` — seules les clés
 * hors-note (`commentaire`, `date_debut`, `date_fin`) diffèrent, voire rien.
 *
 * Sert à éviter un `recalcResultatsPourSolution()` inutile : corriger une faute
 * de frappe dans un commentaire déclenchait un recalcul complet des agrégats de
 * la solution (des dizaines de requêtes séquentielles) alors que le texte
 * n'entre dans aucune moyenne. C'est un poste réel de CPU Vercel Fluid.
 *
 * Comparaison volontairement laxiste (`String()`) : `3` et `'3'` sont la même
 * note. En cas de doute (clé absente d'un côté, valeur exotique), la fonction
 * renvoie `false` → on recalcule. L'erreur sûre est de recalculer pour rien.
 */
function notesInchangees(avant: ScoresRecord | null | undefined, apres: ScoresRecord | null | undefined): boolean {
  const notesSeules = (scores: ScoresRecord | null | undefined) => {
    const out: Record<string, string> = {}
    for (const [cle, valeur] of Object.entries(scores ?? {})) {
      if (SCORES_META_KEYS.has(cle)) continue
      out[cle] = String(valeur)
    }
    return out
  }

  const a = notesSeules(avant)
  const b = notesSeules(apres)
  const cles = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const cle of cles) {
    if (a[cle] !== b[cle]) return false
  }
  return true
}

/**
 * Crée une ligne solutions_utilisees pour (userId, solutionId) si elle n'existe pas.
 * Utilisé après rattachement d'évals anonymes pour qu'elles apparaissent dans
 * /mon-compte/mes-evaluations (qui itère sur solutions_utilisees).
 *
 * ⚠️ `date_debut` doit reprendre la réponse au questionnaire quand elle existe : la
 * remplir avec la date du jour revient à enregistrer « commence à utiliser le logiciel
 * aujourd'hui » pour un médecin qui vient de déclarer 5 ans d'usage (bug 2026-09-02).
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

  const { data: evalRow } = await supabase
    .from('evaluations')
    .select('scores')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .limit(1)
  const { dateDebut, dateFin } = datesUtilisationDeclarees(evalRow?.[0]?.scores)

  await supabase.from('solutions_utilisees').insert({
    user_id: userId,
    solution_id: solutionId,
    statut_evaluation: 'finalisee',
    date_debut: dateDebut || new Date().toISOString().split('T')[0],
    date_fin: dateFin,
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

  // Mode legacy ? + slug/catégorie pour une revalidation CIBLÉE de la fiche
  const { data: solRow } = await supabase
    .from('solutions')
    .select('is_firebase_legacy, slug, id_categorie')
    .eq('id', solutionId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isLegacy = (solRow as any)?.is_firebase_legacy === true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solSlug = (solRow as any)?.slug as string | null | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solCategorieId = (solRow as any)?.id_categorie as string | null | undefined

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
    await revalidateSolution(solSlug, solCategorieId)
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

  await revalidateSolution(solSlug, solCategorieId)
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
  // `last_date_note` est la clé du tri par défaut des témoignages sur la fiche
  // (cf. getAvisUtilisateursPaginated) : une reconfirmation réordonne donc la liste
  // publique. Sans revalidation, le nouvel ordre n'apparaît qu'à l'expiration ISR (1h).
  await revalidateSolutionById(solutionId)
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
    const declarees = datesUtilisationDeclarees(scores)
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      // 'aCompleter' = comptée mais sous-critères non finalisés ; sinon 'instanciee'.
      statut_evaluation: estValide ? 'aCompleter' : 'instanciee',
      date_debut: declarees.dateDebut || new Date().toISOString().split('T')[0],
      date_fin: declarees.dateFin,
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
    .select('id, scores, statut, moyenne_utilisateur')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  // Seul du texte a changé (commentaire / dates) sur une éval DÉJÀ comptabilisée ?
  // Alors les agrégats ne peuvent pas bouger → recalcul inutile (cf. notesInchangees).
  // Les garde-fous (`statut='publiee'` + moyenne stockée identique à celle qu'on écrit)
  // couvrent le cas où l'éval ENTRE dans les agrégats à cette sauvegarde : là il faut
  // recalculer même à notes identiques, car `recalcResultatsPourSolution` filtre sur
  // statut + `moyenne_utilisateur` non nulle, et repart de la moyenne stockée.
  const evalAvant = existingEval?.[0]
  const seulTexteModifie =
    !!evalAvant &&
    evalAvant.statut === 'publiee' &&
    evalAvant.moyenne_utilisateur === moyenne &&
    notesInchangees(evalAvant.scores as ScoresRecord | null, scores)

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
      if (estValide && seulTexteModifie) {
        // Agrégats inchangés : on saute le recalcul mais on revalide quand même,
        // sinon le commentaire modifié resterait invisible jusqu'à 1h (ISR fiche).
        await revalidateSolutionById(solutionId)
      } else if (estValide) {
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
    .select('id, scores, statut, moyenne_utilisateur')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const existingEval = existingEvals?.[0]
  const moyenneArrondie = Math.round(moyenne * 100) / 100

  // Rien qui puisse bouger les agrégats ? (mêmes notes, même moyenne, éval déjà publiée)
  // → recalcul inutile. Le test sur `moyenne_utilisateur` couvre aussi le cas de l'éval
  // qui ENTRE dans les agrégats maintenant (passage en_attente_psc → publiee, ou moyenne
  // jusqu'ici nulle) : `recalcResultatsPourSolution` filtre sur statut + moyenne non nulle.
  const seulTexteModifie =
    !!existingEval &&
    existingEval.statut === 'publiee' &&
    existingEval.moyenne_utilisateur === moyenneArrondie &&
    notesInchangees(existingEval.scores as ScoresRecord | null, scores)

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
        moyenne_utilisateur: moyenneArrondie,
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
      moyenne_utilisateur: moyenneArrondie,
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
      if (statut === 'publiee' && seulTexteModifie) {
        // Agrégats inchangés : on saute le recalcul mais on revalide quand même,
        // sinon le commentaire modifié resterait invisible jusqu'à 1h (ISR fiche).
        await revalidateSolutionById(solutionId)
      } else if (statut === 'publiee') {
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
          diff: { note: { avant: null, apres: moyenneArrondie } },
        })
      }
      // Pas de revalidatePath ici : recalcResultatsPourSolution() revalide déjà
      // '/solutions' en mode 'layout' quand la note est publiée. Rien de public ne
      // change dans le cas en_attente_psc.
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
