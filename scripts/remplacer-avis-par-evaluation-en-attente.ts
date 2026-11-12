/**
 * Rejoue, pour une évaluation restée en attente, le rattachement corrigé le 2026-11-12 : le
 * médecin avait déjà un avis publié sur ce logiciel et a validé son identité par Pro Santé
 * Connect, mais le rattachement échouait sans message (un avis par compte et par logiciel).
 * Ses nouvelles notes passent sur l'avis de son compte, l'évaluation en attente est supprimée,
 * exactement comme le fait désormais la route PSC (même fonction : src/lib/evaluations/en-attente-psc.ts).
 *
 * Première utilisation le 2026-11-12 (décision de David : « la nouvelle note remplace ») :
 * HelloDoc (Dr Rozand, validé par PSC le 08/10 et le 19/10) et Weda (Dr Peltier, le 31/10 et le 09/11).
 *
 * Conditions, sinon refus :
 * - évaluation en attente, déposée sans compte ;
 * - un seul compte à cette adresse (email ou contact_email), avec un RPPS ;
 * - une connexion PSC réussie de ce compte après le dépôt (preuve de la validation) ;
 * - un avis publié du compte sur ce logiciel, plus ancien ;
 * - aucun recalcul des notes nécessaire : l'avis du compte est antérieur au lancement du site
 *   sur une fiche dont la note historique est figée (il n'entre pas dans le calcul, avant comme
 *   après). Le recalcul passe par le site, hors de portée d'un script.
 *
 * Filet : dry-run par défaut, `--execute` requis ; les deux lignes sauvegardées dans backups/.
 *
 * Usage : npx tsx scripts/remplacer-avis-par-evaluation-en-attente.ts <id> [<id>…]            # dry-run
 *         npx tsx scripts/remplacer-avis-par-evaluation-en-attente.ts <id> [<id>…] --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'
import { rattacherEvaluationsEnAttente, assurerSuiviFinalise, estRattachee } from '../src/lib/evaluations/en-attente-psc'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const IDS = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Même date que DATE_MISE_EN_LIGNE dans src/lib/actions/evaluation.ts
const DATE_MISE_EN_LIGNE = '2026-04-12T00:00:00Z'

async function traiter(id: string) {
  console.log(`\n══ Évaluation ${id}`)
  const { data: ev, error } = await supabase
    .from('evaluations')
    .select('id, solution_id, scores, moyenne_utilisateur, last_date_note, email_temp, statut, user_id, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!ev) throw new Error('introuvable')
  if (ev.statut !== 'en_attente_psc' || ev.user_id || !ev.email_temp || !ev.solution_id || !ev.last_date_note) {
    throw new Error(`refus : pas une évaluation en attente déposée sans compte (statut ${ev.statut})`)
  }

  const { data: solution } = await supabase
    .from('solutions').select('nom, is_firebase_legacy').eq('id', ev.solution_id).single()

  // Compte(s) à cette adresse
  const [parEmail, parContact] = await Promise.all([
    supabase.from('users').select('id, prenom, nom, rpps').eq('email', ev.email_temp),
    supabase.from('users').select('id, prenom, nom, rpps').eq('contact_email', ev.email_temp),
  ])
  const comptes = new Map([...(parEmail.data ?? []), ...(parContact.data ?? [])].map((u) => [u.id, u]))
  if (comptes.size !== 1) throw new Error(`refus : ${comptes.size} compte(s) à cette adresse`)
  const compte = [...comptes.values()][0]
  if (!compte.rpps) throw new Error('refus : compte sans RPPS')

  // Preuve de la validation PSC après le dépôt
  const { data: connexions } = await supabase
    .from('psc_session_events')
    .select('created_at')
    .eq('user_id', compte.id)
    .eq('step', 'verify_success')
    .gt('created_at', ev.last_date_note)
    .order('created_at')
  if (!connexions?.length) throw new Error('refus : aucune connexion PSC réussie après le dépôt')

  const { data: avis } = await supabase
    .from('evaluations')
    .select('*')
    .eq('user_id', compte.id)
    .eq('solution_id', ev.solution_id)
    .neq('id', ev.id)
    .maybeSingle()
  if (!avis || avis.statut !== 'publiee') throw new Error('refus : pas d\'avis publié du compte sur ce logiciel')
  if (Date.parse(avis.last_date_note ?? '') >= Date.parse(ev.last_date_note)) {
    throw new Error('refus : l\'avis du compte est plus récent que l\'évaluation en attente')
  }
  const horsCalcul = solution?.is_firebase_legacy === true && Date.parse(avis.created_at ?? '') < Date.parse(DATE_MISE_EN_LIGNE)
  if (!horsCalcul) throw new Error('refus : un recalcul des notes serait nécessaire (à faire passer par le site)')

  console.log(`Logiciel : ${solution?.nom} ; compte : ${compte.prenom} ${compte.nom} (${compte.id})`)
  console.log(`Connexions PSC réussies après le dépôt : ${connexions.map((c) => c.created_at).join(', ')}`)
  console.log(`Avis du compte    : ${avis.id}, moyenne ${avis.moyenne_utilisateur}, noté le ${avis.last_date_note}, créé le ${avis.created_at}`)
  console.log(`Évaluation en attente : moyenne ${ev.moyenne_utilisateur}, déposée le ${ev.last_date_note}`)
  console.log('Notes de la fiche : inchangées (avis antérieur au lancement, fiche à note historique figée).')
  console.log('À faire : notes, moyenne et date de l\'évaluation en attente → avis du compte ; évaluation en attente supprimée ; suivi « finalisée ».')
  if (!EXECUTE) return

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const sauvegarde = path.join(dossier, `remplacer-avis-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const { data: evComplete } = await supabase.from('evaluations').select('*').eq('id', id).single()
  const { data: suivi } = await supabase.from('solutions_utilisees').select('*').eq('user_id', compte.id).eq('solution_id', ev.solution_id)
  fs.writeFileSync(sauvegarde, JSON.stringify({ evaluation_en_attente: evComplete, avis_du_compte: avis, suivi }, null, 2))
  console.log('Sauvegarde :', sauvegarde)

  const [resultat] = await rattacherEvaluationsEnAttente(supabase, compte.id, [ev], { publier: true })
  console.log('Résultat :', resultat.issue, resultat.erreur ?? '')
  if (!estRattachee(resultat)) throw new Error('rattachement non effectué')
  await assurerSuiviFinalise(supabase, compte.id, ev.solution_id, ev.scores)

  const [{ data: avisApres }, { data: enAttente }, { data: suiviApres }] = await Promise.all([
    supabase.from('evaluations').select('id, statut, moyenne_utilisateur, last_date_note').eq('id', avis.id).single(),
    supabase.from('evaluations').select('id').eq('id', id).maybeSingle(),
    supabase.from('solutions_utilisees').select('statut_evaluation').eq('user_id', compte.id).eq('solution_id', ev.solution_id),
  ])
  console.log('Avis du compte après :', avisApres)
  console.log('Évaluation en attente après :', enAttente ? 'ENCORE PRÉSENTE' : 'supprimée')
  console.log('Suivi après :', suiviApres)
}

async function main() {
  if (IDS.length === 0) throw new Error('Usage : npx tsx scripts/remplacer-avis-par-evaluation-en-attente.ts <id> [<id>…] [--execute]')
  for (const id of IDS) await traiter(id)
  if (!EXECUTE) console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
