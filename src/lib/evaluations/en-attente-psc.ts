/**
 * Évaluations déposées sans compte (adresse saisie dans `email_temp`), en attente de
 * validation Pro Santé Connect : les retrouver, les rattacher à un compte, et savoir si une
 * adresse appartient déjà à un compte vérifié.
 *
 * Utilisé par la route PSC (`/api/auth/psc-callback`), le rattachement au chargement du
 * profil (`rattacherEvalsAnonymes`), la relance PSC du lundi, la page Admin → Emails et
 * le script `scripts/remplacer-avis-par-evaluation-en-attente.ts`.
 *
 * Module sans `'use server'`, imports relatifs : il reçoit le client service role en
 * paramètre, ce qui permet aussi de l'appeler depuis un script `tsx`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database'
import { datesUtilisationDeclarees } from '../duree-utilisation'

type ClientAdmin = SupabaseClient<Database>

export type EvaluationEnAttente = {
  id: string
  solution_id: string | null
  scores: Json
  moyenne_utilisateur: number | null
  last_date_note: string | null
  email_temp: string | null
}

const COLONNES = 'id, solution_id, scores, moyenne_utilisateur, last_date_note, email_temp'

/**
 * Toutes les évaluations en attente retrouvées par le jeton du lien **et** par les adresses.
 *
 * Avant le 2026-11-12, la route PSC s'arrêtait à la première piste qui trouvait quelque
 * chose : valider le lien d'une évaluation laissait de côté les autres évaluations déposées
 * avec la même adresse, qui restaient en attente et continuaient d'être relancées.
 * Les évaluations trouvées par le jeton viennent en premier.
 */
export async function trouverEvaluationsEnAttente(
  admin: ClientAdmin,
  { jeton, adresses }: { jeton?: string | null; adresses: Array<string | null | undefined> }
): Promise<EvaluationEnAttente[]> {
  const trouvees = new Map<string, EvaluationEnAttente>()

  if (jeton) {
    const { data, error } = await admin
      .from('evaluations')
      .select(COLONNES)
      .eq('token_verification', jeton)
      .eq('statut', 'en_attente_psc')
    if (error) throw new Error(`évaluations en attente (jeton) : ${error.message}`)
    for (const ev of data ?? []) trouvees.set(ev.id, ev)
  }

  // `email_temp` est enregistré en minuscules (submitEvaluationAnonyme).
  const normalisees = [...new Set(
    adresses.map((a) => a?.trim().toLowerCase()).filter((a): a is string => !!a)
  )]
  if (normalisees.length > 0) {
    const { data, error } = await admin
      .from('evaluations')
      .select(COLONNES)
      .in('email_temp', normalisees)
      .eq('statut', 'en_attente_psc')
    if (error) throw new Error(`évaluations en attente (adresse) : ${error.message}`)
    for (const ev of data ?? []) if (!trouvees.has(ev.id)) trouvees.set(ev.id, ev)
  }

  return [...trouvees.values()]
}

export type IssueRattachement =
  /** Rattachée au compte telle quelle (aucun avis du compte sur ce logiciel). */
  | 'rattachee'
  /** Le compte avait déjà un avis sur ce logiciel, plus ancien : il prend les nouvelles notes. */
  | 'remplace'
  /** Le compte avait déjà un avis plus récent sur ce logiciel : l'évaluation en attente est supprimée. */
  | 'ecartee'
  /** Le compte a déjà un avis sur ce logiciel mais n'est pas vérifié : rien n'est touché. */
  | 'laissee'
  | 'echec'

export type ResultatRattachement = {
  evaluationId: string
  solutionId: string | null
  /** Notes désormais portées par l'avis du compte (pour les dates d'utilisation déclarées). */
  scores: Json
  issue: IssueRattachement
  erreur?: string
}

function horodatage(date: string | null): number {
  const t = date ? Date.parse(date) : NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * Rattache des évaluations en attente au compte `userId`.
 *
 * `publier` : vrai quand l'identité du compte est vérifiée par PSC (statut `publiee`) ;
 * sinon l'évaluation est rattachée mais reste `en_attente_psc`.
 *
 * Un compte n'a qu'un avis par logiciel (contrainte `evaluations_user_id_solution_id_key`).
 * Avant le 2026-11-12, rattacher une évaluation sur un logiciel que le compte avait déjà noté
 * échouait sans message : le site annonçait « évaluation publiée », elle restait en attente
 * et la relance continuait. Désormais, la plus récente des deux l'emporte, comme si le
 * médecin avait refait son évaluation en étant connecté : ses notes passent sur l'avis du
 * compte (qui garde sa date de création, donc sa place dans le calcul des notes) et
 * l'évaluation en attente est supprimée. Sans identité vérifiée, on ne touche à rien :
 * remplacer un avis publié par des notes non vérifiées le dépublierait.
 *
 * Ne s'occupe que de `evaluations` : le suivi (`assurerSuiviFinalise`) et le recalcul des
 * notes restent à la charge de l'appelant, pour les issues `rattachee` et `remplace`.
 */
export async function rattacherEvaluationsEnAttente(
  admin: ClientAdmin,
  userId: string,
  evaluations: EvaluationEnAttente[],
  { publier }: { publier: boolean }
): Promise<ResultatRattachement[]> {
  const resultats: ResultatRattachement[] = []

  for (const ev of evaluations) {
    const base = { evaluationId: ev.id, solutionId: ev.solution_id, scores: ev.scores }
    const echec = (erreur: string) => {
      console.error(`[rattachement] évaluation ${ev.id} :`, erreur)
      resultats.push({ ...base, issue: 'echec', erreur })
    }

    let existante: { id: string; last_date_note: string | null } | null = null
    if (ev.solution_id) {
      const { data, error } = await admin
        .from('evaluations')
        .select('id, last_date_note')
        .eq('user_id', userId)
        .eq('solution_id', ev.solution_id)
        .neq('id', ev.id)
        .maybeSingle()
      if (error) { echec(error.message); continue }
      existante = data
    }

    if (!existante) {
      const { data, error } = await admin
        .from('evaluations')
        .update({
          user_id: userId,
          statut: publier ? 'publiee' : 'en_attente_psc',
          email_temp: null,
          token_verification: null,
        })
        .eq('id', ev.id)
        .eq('statut', 'en_attente_psc')
        .select('id')
      if (error) { echec(error.message); continue }
      if (!data?.length) { echec('évaluation plus en attente'); continue }
      resultats.push({ ...base, issue: 'rattachee' })
      continue
    }

    if (!publier) {
      resultats.push({ ...base, issue: 'laissee' })
      continue
    }

    if (horodatage(ev.last_date_note) > horodatage(existante.last_date_note)) {
      const { data, error } = await admin
        .from('evaluations')
        .update({
          scores: ev.scores,
          moyenne_utilisateur: ev.moyenne_utilisateur,
          last_date_note: ev.last_date_note,
          statut: 'publiee',
        })
        .eq('id', existante.id)
        .select('id')
      if (error) { echec(error.message); continue }
      if (!data?.length) { echec('avis du compte introuvable'); continue }
      resultats.push({ ...base, issue: 'remplace' })
    } else {
      resultats.push({ ...base, issue: 'ecartee' })
    }

    // Les notes sont passées sur l'avis du compte (ou il est plus récent) : l'évaluation en
    // attente n'a plus lieu d'être. Un échec ici laisse un doublon sans effet sur les notes
    // (statut en attente), repris au prochain rattachement.
    const { error: errSuppr } = await admin
      .from('evaluations')
      .delete()
      .eq('id', ev.id)
      .eq('statut', 'en_attente_psc')
    if (errSuppr) console.error(`[rattachement] suppression de l'évaluation ${ev.id} :`, errSuppr.message)
  }

  return resultats
}

/** Issues qui changent ce que montre le compte : `solutions_utilisees` et recalcul à faire. */
export function estRattachee(r: ResultatRattachement): boolean {
  return r.issue === 'rattachee' || r.issue === 'remplace'
}

/**
 * Suivi « Mes évaluations » (`solutions_utilisees`) d'une évaluation rattachée : créé avec
 * les dates déclarées s'il manque (les poser à « aujourd'hui » affichait l'âge de l'avis à
 * la place de la durée d'usage, fix 2026-09-02), sinon passé à « finalisée ». L'évaluation
 * déposée est complète, comme après `submitEvaluation` ; un suivi « ancienne » la cachait,
 * un suivi « à compléter » la donnait pour inachevée.
 */
export async function assurerSuiviFinalise(
  admin: ClientAdmin,
  userId: string,
  solutionId: string,
  scores: Json
): Promise<void> {
  const { data: suivi, error } = await admin
    .from('solutions_utilisees')
    .select('id, statut_evaluation')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .limit(1)
  if (error) {
    console.error('[rattachement] solutions_utilisees :', error.message)
    return
  }

  if (!suivi || suivi.length === 0) {
    const { dateDebut, dateFin } = datesUtilisationDeclarees(scores)
    const { error: errInsert } = await admin.from('solutions_utilisees').insert({
      user_id: userId,
      solution_id: solutionId,
      statut_evaluation: 'finalisee',
      date_debut: dateDebut || new Date().toISOString().split('T')[0],
      date_fin: dateFin,
    })
    if (errInsert) console.error('[rattachement] solutions_utilisees insert :', errInsert.message)
  } else if (suivi[0].statut_evaluation !== 'finalisee') {
    const { error: errMaj } = await admin
      .from('solutions_utilisees')
      .update({ statut_evaluation: 'finalisee' })
      .eq('id', suivi[0].id)
    if (errMaj) console.error('[rattachement] solutions_utilisees update :', errMaj.message)
  }
}

/**
 * Adresses (en minuscules) des comptes dont l'identité est vérifiée (RPPS renseigné) :
 * `email` et `contact_email`.
 *
 * Sert à ne pas relancer « validez avec Pro Santé Connect » un médecin qui a déjà un compte
 * vérifié : le message est faux pour lui, et une simple connexion rattache l'évaluation
 * (`rattacherEvalsAnonymes`, route PSC). Lecture complète par pages de 1 000 (environ
 * 7 000 comptes) : une recherche par liste d'adresses manquerait celles enregistrées avec
 * des majuscules.
 */
export async function adressesDeComptesVerifies(admin: ClientAdmin): Promise<Set<string>> {
  const adresses = new Set<string>()
  const PAGE = 1000
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await admin
      .from('users')
      .select('id, email, contact_email')
      .not('rpps', 'is', null)
      .order('id')
      .range(debut, debut + PAGE - 1)
    if (error) throw new Error(`comptes vérifiés : ${error.message}`)
    for (const u of data ?? []) {
      for (const a of [u.email, u.contact_email]) {
        const adresse = a?.trim().toLowerCase()
        if (adresse) adresses.add(adresse)
      }
    }
    if (!data || data.length < PAGE) break
  }
  return adresses
}
