/**
 * fix-evaluations-commentaires.ts
 *
 * Ce script corrige deux problèmes issus de la migration Firebase → Supabase :
 *
 * 1. Scores avec clés numériques ("1", "2", ...) : remapping vers identifiantTech
 *    ("interface", "fonctionnalites", etc.)
 *
 * 2. Commentaires non migrés : récupère le champ commentaire depuis Firebase
 *    et l'ajoute dans evaluations.scores.commentaire
 *
 * Usage :
 *   npx ts-node scripts/fix-evaluations-commentaires.ts --dry-run  (simulation)
 *   npx ts-node scripts/fix-evaluations-commentaires.ts             (écriture)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🔍 Mode dry-run activé — aucune écriture\n')

// ─── Firebase init ─────────────────────────────────────────────────────────
const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

// ─── Supabase init (service role = bypass RLS) ─────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchCollection(name: string) {
  const snapshot = await firestore.collection(name).get()
  return snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() }))
}

function hasOnlyNumericKeys(scores: Record<string, unknown>): boolean {
  const keys = Object.keys(scores).filter(k => k !== 'commentaire')
  if (keys.length === 0) return false
  return keys.every(k => /^\d+$/.test(k))
}

// ─── Chargement Supabase en mémoire ────────────────────────────────────────
async function loadSupabaseUsers(): Promise<Map<string, string>> {
  // rpps → supabase_id
  const map = new Map<string, string>()
  let offset = 0
  while (true) {
    const { data } = await supabase.from('users').select('id, rpps').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const u of data) {
      if (u.rpps) map.set(String(u.rpps), u.id)
    }
    offset += 1000
    if (data.length < 1000) break
  }
  return map
}

async function loadSupabaseSolutions(): Promise<Map<string, string>> {
  // slug → supabase_id
  const map = new Map<string, string>()
  let offset = 0
  while (true) {
    const { data } = await supabase.from('solutions').select('id, slug').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const s of data) {
      if (s.slug) map.set(s.slug.toLowerCase(), s.id)
    }
    offset += 1000
    if (data.length < 1000) break
  }
  return map
}

async function loadSupabaseEvaluations(): Promise<Map<string, { id: string; scores: Record<string, unknown> }>> {
  // "user_id__solution_id" → { id, scores }
  const map = new Map<string, { id: string; scores: Record<string, unknown> }>()
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('evaluations')
      .select('id, user_id, solution_id, scores')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const e of data) {
      const key = `${e.user_id}__${e.solution_id}`
      map.set(key, { id: e.id, scores: (e.scores as Record<string, unknown>) || {} })
    }
    offset += 1000
    if (data.length < 1000) break
  }
  return map
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Démarrage de fix-evaluations-commentaires\n')

  // 1. Charger Firebase
  console.log('📥 Chargement Firebase...')
  const fbCriteres = await fetchCollection('criteres')
  const fbUsers = await fetchCollection('users')
  const fbEvaluations = await fetchCollection('evaluations')
  console.log(`  ${fbCriteres.length} critères, ${fbUsers.length} users, ${fbEvaluations.length} évaluations\n`)

  // 2. Construire critereIdToTech (Firebase _fid → identifiantTech)
  const critereIdToTech: Record<string, string> = {}
  for (const c of fbCriteres) {
    const d = c as any
    if (d.identifiantTech) critereIdToTech[c._fid] = d.identifiantTech
  }
  console.log(`  ${Object.keys(critereIdToTech).length} critères mappés (fid → identifiantTech)`)

  // 3. Construire Firebase user _fid → rpps
  const fbUserRpps: Record<string, string> = {}
  for (const u of fbUsers) {
    const d = u as any
    fbUserRpps[u._fid] = String(d.rpps || u._fid)
  }

  // 4. Charger Supabase
  console.log('\n📥 Chargement Supabase...')
  const sbUsers = await loadSupabaseUsers()        // rpps → id
  const sbSolutions = await loadSupabaseSolutions() // slug → id
  const sbEvals = await loadSupabaseEvaluations()  // "uid__sid" → { id, scores }
  console.log(`  ${sbUsers.size} users, ${sbSolutions.size} solutions, ${sbEvals.size} évaluations\n`)

  // 5. Traitement
  let countRemapped = 0
  let countCommentaire = 0
  let countUpdated = 0
  let countSkipped = 0
  let countNotFound = 0

  const updates: Array<{ evalId: string; scores: Record<string, unknown> }> = []

  for (const e of fbEvaluations) {
    const ev = e as any

    // Résoudre user_id Supabase
    const rpps = fbUserRpps[ev.idUser] || ev.idUser
    const sbUserId = sbUsers.get(rpps)
    if (!sbUserId) { countNotFound++; continue }

    // Résoudre solution_id Supabase
    const solutionSlug = ev.idSolution?.toLowerCase()
    const sbSolutionId = solutionSlug ? sbSolutions.get(solutionSlug) : undefined
    if (!sbSolutionId) { countNotFound++; continue }

    // Trouver l'évaluation Supabase
    const key = `${sbUserId}__${sbSolutionId}`
    const sbEval = sbEvals.get(key)
    if (!sbEval) { countNotFound++; continue }

    const currentScores = sbEval.scores

    // Extraire le commentaire depuis Firebase (champ direct ou dans scores)
    const commentaire: string | null =
      (typeof ev.commentaire === 'string' && ev.commentaire.trim() ? ev.commentaire.trim() : null) ||
      (typeof ev.scores?.commentaire === 'string' && ev.scores.commentaire.trim() ? ev.scores.commentaire.trim() : null)

    // Remapper les scores si nécessaire
    let newScores: Record<string, unknown> = { ...currentScores }
    let didRemap = false
    let didAddCommentaire = false

    if (hasOnlyNumericKeys(currentScores)) {
      // Remapper les clés numériques vers identifiantTech
      const remapped: Record<string, unknown> = {}
      for (const [cid, score] of Object.entries(currentScores)) {
        if (cid === 'commentaire') continue
        const tech = critereIdToTech[cid]
        if (tech) {
          remapped[tech] = score
        } else {
          // Clé numérique inconnue : conserver sous sa forme originale
          remapped[cid] = score
        }
      }
      if (Object.keys(remapped).some(k => !(/^\d+$/.test(k)))) {
        // Au moins une clé a été traduite
        newScores = remapped
        didRemap = true
        countRemapped++
      }
    }

    // Ajouter le commentaire si présent et non déjà là
    if (commentaire && !currentScores.commentaire) {
      newScores.commentaire = commentaire
      didAddCommentaire = true
      countCommentaire++
    }

    if (!didRemap && !didAddCommentaire) {
      countSkipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  [DRY] eval ${sbEval.id}:${didRemap ? ' scores remappés' : ''}${didAddCommentaire ? ' commentaire ajouté' : ''}`)
      if (didRemap) {
        const before = Object.keys(currentScores).filter(k => k !== 'commentaire')
        const after = Object.keys(newScores).filter(k => k !== 'commentaire')
        console.log(`    Avant : ${before.slice(0, 5).join(', ')}${before.length > 5 ? '...' : ''}`)
        console.log(`    Après : ${after.slice(0, 5).join(', ')}${after.length > 5 ? '...' : ''}`)
      }
      if (didAddCommentaire) {
        console.log(`    Commentaire : "${commentaire!.slice(0, 80)}${commentaire!.length > 80 ? '...' : ''}"`)
      }
      countUpdated++
    } else {
      updates.push({ evalId: sbEval.id, scores: newScores })
      countUpdated++
    }
  }

  // 6. Écriture (par lots de 50)
  if (!DRY_RUN && updates.length > 0) {
    console.log(`\n✏️  Mise à jour de ${updates.length} évaluations...`)
    let done = 0
    for (const { evalId, scores } of updates) {
      const { error } = await supabase
        .from('evaluations')
        .update({ scores })
        .eq('id', evalId)
      if (error) {
        console.error(`  ❌ eval ${evalId}: ${error.message}`)
      } else {
        done++
        if (done % 50 === 0) console.log(`  ... ${done}/${updates.length}`)
      }
    }
    console.log(`  ✅ ${done} évaluations mises à jour`)
  }

  // 7. Résumé
  console.log('\n' + '='.repeat(50))
  console.log('📊 Résumé')
  console.log('='.repeat(50))
  console.log(`  Évaluations Firebase traitées : ${fbEvaluations.length}`)
  console.log(`  Non trouvées en Supabase      : ${countNotFound}`)
  console.log(`  Ignorées (déjà correctes)     : ${countSkipped}`)
  console.log(`  Scores remappés               : ${countRemapped}`)
  console.log(`  Commentaires récupérés        : ${countCommentaire}`)
  console.log(`  Mises à jour ${DRY_RUN ? '(simulées)' : 'effectuées'}       : ${countUpdated}`)
  if (DRY_RUN) console.log('\n  ⚠️  Relancer sans --dry-run pour appliquer les changements')
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale:', err)
  process.exit(1)
})
