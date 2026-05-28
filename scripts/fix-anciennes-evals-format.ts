/**
 * Fix #3 : convertir les 16 évals SB en "ancien format" (clés numériques "6"-"50")
 * vers le format moderne detail_*.
 *
 * Mapping idTech FB → detail_* : table figée ci-dessous (IDTECH_TO_DETAIL), construite en
 * combinant deux sources concordantes (cf session 2026-05-28) :
 *   - le fichier officiel `mapping_criteres_v2.csv` (colonnes ancien_critere_1/2 → detail_*)
 *   - une reconstruction empirique (valeur SB == valeur FB/2 sur 250-590 évals déjà converties)
 * Les deux sources sont cohérentes ; l'empirique a comblé 5 trous du CSV (doublons de libellé,
 * critères marqués "ajouté" mais en fait matchables : 12, 23, 27, 28, 48, 49).
 *
 * Fusions N→1 (idTech 13+16 → modeles_ordonnance ; 14+36 → signature_numerique ;
 * 44+45 → sav ; 46+47 → formation) : MOYENNE des valeurs FB/2 (comportement migration d'origine).
 *
 * idTech sans équivalent moderne (supprimés) : 10 (Dossier patient), 19 (Réception),
 * 30 (Base de documents), 41 (Objets connectés), 50 (commentaire, géré par Fix #2).
 *
 * Conversion : valeur FB brute (0-10) / 2 → valeur moderne (0-5).
 * Les 5 majeurs et le commentaire sont conservés (déjà corrects via Fix #1/#2).
 *
 * Garde-fou évals vides : si après conversion aucun majeur ni detail_* valide → skip + log.
 *
 * BACKUP JSON dans docs/.
 *
 * Usage :
 *   npx tsx scripts/fix-anciennes-evals-format.ts          # dry-run
 *   npx tsx scripts/fix-anciennes-evals-format.ts --execute # écrit
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fsmod from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const sa = require(path.resolve(__dirname, '../../CloudStation/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(sa) })
const firestore = getFirestore()
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const EXECUTE = process.argv.includes('--execute')

// Mapping idTech FB → detail_* (CSV officiel + empirique, validés concordants — cf en-tête).
// Absents = pas d'équivalent moderne (10, 19, 30, 41) → supprimés à la conversion.
const IDTECH_TO_DETAIL: Record<string, string> = {
  '6': 'detail_prise_en_main',
  '7': 'detail_donnees_utiles_prescription',
  '8': 'detail_reactif',
  '9': 'detail_stabilite',
  '11': 'detail_ordonnance_pharmacie',
  '12': 'detail_alertes_ldap',
  '13': 'detail_modeles_ordonnance',
  '14': 'detail_signature_numerique',
  '15': 'detail_prescription_autres',
  '16': 'detail_modeles_ordonnance',
  '17': 'detail_classement_docs',
  '18': 'detail_courrier_adressage',
  '20': 'detail_resultats_bio',
  '21': 'detail_teletransmission',
  '22': 'detail_carnet_adresse',
  '23': 'detail_comptabilite',
  '24': 'detail_hebergement',
  '25': 'detail_maj',
  '26': 'detail_messagerie_interne',
  '27': 'detail_agenda',
  '28': 'detail_recherche_multicriteres',
  '29': 'detail_modeles_consultation',
  '31': 'detail_ia_scribe',
  '32': 'detail_droits_acces',
  '33': 'detail_examens_visualisation',
  '34': 'detail_teleservices',
  '35': 'detail_messagerie_securisee',
  '36': 'detail_signature_numerique',
  '37': 'detail_examens_integration',
  '38': 'detail_dmp_recuperation',
  '39': 'detail_mobilite',
  '40': 'detail_teleexpertise',
  '42': 'detail_resiliation',
  '43': 'detail_pratiques_commerciales',
  '44': 'detail_sav',
  '45': 'detail_sav',
  '46': 'detail_formation',
  '47': 'detail_formation',
  '48': 'detail_ecoute_besoins',
  '49': 'detail_nps',
}

function numericKeys(scores: any): string[] {
  if (!scores || typeof scores !== 'object') return []
  return Object.keys(scores).filter(k => /^\d+$/.test(k))
}

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE' : '🟢 DRY-RUN'}\n`)

  const idTechToDetail = IDTECH_TO_DETAIL
  console.log(`Mapping idTech → detail_* (table figée CSV+empirique) : ${Object.keys(idTechToDetail).length} entrées`)
  // Vérif : detail_* cibles multiples (fusions N→1)
  const detailTargets: Record<string, string[]> = {}
  for (const [tech, detail] of Object.entries(idTechToDetail)) {
    (detailTargets[detail] ??= []).push(tech)
  }
  const fusions = Object.entries(detailTargets).filter(([, techs]) => techs.length > 1)
  if (fusions.length) {
    console.log('Fusions N→1 détectées (moyenne appliquée) :')
    for (const [detail, techs] of fusions) console.log(`  ${detail} ← idTech ${techs.join('+')}`)
  }
  console.log()

  const { data: solutions } = await s.from('solutions').select('id, nom').eq('is_firebase_legacy', true)

  type Update = { evalId: string; sol: string; oldScores: Record<string, any>; newScores: Record<string, any>; converted: number; dropped: string[] }
  const updates: Update[] = []
  const skippedEmpty: string[] = []
  const idTechDropped = new Map<string, number>()

  for (const sol of solutions ?? []) {
    const { data: evalsSb } = await s.from('evaluations').select('id, scores').eq('solution_id', sol.id)
    if (!evalsSb) continue

    for (const e of evalsSb) {
      if (numericKeys(e.scores).length === 0) continue
      const oldScores = (e.scores ?? {}) as Record<string, any>

      // 1) Conserver les clés modernes (majeurs, commentaire, éventuels detail_* déjà présents)
      const newScores: Record<string, any> = {}
      for (const [k, v] of Object.entries(oldScores)) {
        if (!/^\d+$/.test(k)) newScores[k] = v
      }

      // 2) Regrouper les valeurs numériques par detail_* cible (pour gérer les fusions N→1)
      const detailValues: Record<string, number[]> = {}
      const dropped: string[] = []
      let converted = 0
      for (const [k, v] of Object.entries(oldScores)) {
        if (!/^\d+$/.test(k)) continue
        if (k === '50') continue  // commentaire géré ailleurs
        const detailKey = idTechToDetail[k]
        if (!detailKey) {
          dropped.push(k)
          idTechDropped.set(k, (idTechDropped.get(k) ?? 0) + 1)
          continue
        }
        if (v === null || v === undefined || v === '') continue  // null FB → pas de valeur
        const n = Number(v)
        if (!isFinite(n)) continue
        ;(detailValues[detailKey] ??= []).push(Math.round((n / 2) * 100) / 100)
        converted++
      }

      // 3) Écrire les detail_* (moyenne si fusion). Ne pas écraser un detail_* moderne déjà présent.
      for (const [detailKey, vals] of Object.entries(detailValues)) {
        if (newScores[detailKey] !== undefined && newScores[detailKey] !== null) continue  // déjà présent (moderne) → garder
        const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
        newScores[detailKey] = avg
      }

      // Garde-fou évals vides
      const majorVals = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']
        .map(m => newScores[m]).filter(x => typeof x === 'number' && x > 0)
      const detailVals = Object.entries(newScores).filter(([k, v]) => k.startsWith('detail_') && typeof v === 'number' && v > 0)
      if (majorVals.length === 0 && detailVals.length === 0) { skippedEmpty.push(e.id); continue }

      updates.push({ evalId: e.id, sol: sol.nom, oldScores, newScores, converted, dropped })
    }
  }

  console.log(`=== PLAN ===`)
  console.log(`Évals en ancien format : ${updates.length + skippedEmpty.length}`)
  console.log(`À convertir : ${updates.length} | Skippées (vides) : ${skippedEmpty.length}`)

  console.log(`\nidTech SUPPRIMÉS (absents du CSV — pas d'équivalent moderne) :`)
  const dropSorted = Array.from(idTechDropped.entries()).sort((a, b) => +a[0] - +b[0])
  if (dropSorted.length === 0) console.log('  (aucun)')
  for (const [tech, count] of dropSorted) console.log(`  idTech ${tech} : ${count} évals`)

  console.log(`\nDétail par éval :`)
  for (const u of updates) {
    const oldNum = numericKeys(u.oldScores).length
    const newDetail = Object.keys(u.newScores).filter(k => k.startsWith('detail_')).length
    console.log(`  ${u.sol.padEnd(18)} | ${u.evalId.slice(0, 8)} | ${oldNum} num → ${u.converted} convertis, ${u.dropped.length} supprimés → ${newDetail} detail_* final`)
  }

  // Exemple complet de la 1ère éval (avant/après)
  if (updates.length > 0) {
    const u = updates[0]
    console.log(`\nExemple (${u.sol} ${u.evalId.slice(0, 8)}) :`)
    console.log(`  AVANT clés : ${Object.keys(u.oldScores).sort().join(', ')}`)
    console.log(`  APRÈS clés : ${Object.keys(u.newScores).sort().join(', ')}`)
  }

  if (!EXECUTE) { console.log('\n🟢 Dry-run terminé. Relancer avec --execute pour appliquer.'); return }
  if (updates.length === 0) { console.log('\nRien à faire.'); return }

  console.log('\n🔥 EXECUTION ...')
  const backupPath = path.resolve(__dirname, `../docs/backup-fix-anciennes-evals-20260528-${Date.now()}.json`)
  fsmod.writeFileSync(backupPath, JSON.stringify(updates.map(u => ({
    eval_id: u.evalId, solution: u.sol, anciens_scores: u.oldScores, nouveaux_scores: u.newScores,
    nb_convertis: u.converted, idtech_supprimes: u.dropped,
  })), null, 2))
  console.log(`Backup JSON : ${backupPath}`)

  let ok = 0, ko = 0
  for (const u of updates) {
    const { error } = await s.from('evaluations').update({ scores: u.newScores }).eq('id', u.evalId)
    if (error) { console.log(`  ❌ ${u.evalId} : ${error.message}`); ko++ } else ok++
  }
  console.log(`\n✅ ${ok} updates OK, ${ko} erreurs.`)
}

main().catch(err => { console.error(err); process.exit(1) })
