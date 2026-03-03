/**
 * remap-scores-numeriques.ts
 *
 * Remédie au bug de migration : les evaluations.scores stockent les critères
 * avec leur ancien identifiantTech numérique ("1", "2", ...) au lieu du
 * slug textuel ("interface", "fonctionnalites", ...).
 *
 * Ce script :
 *  1. Lit les critères Firebase pour construire le mapping numéro → slug
 *  2. Met à jour evaluations.scores dans Supabase
 *
 * Usage :
 *   npx tsx scripts/remap-scores-numeriques.ts --dry-run
 *   npx tsx scripts/remap-scores-numeriques.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🔍 Mode dry-run — aucune écriture\n')

const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapping manuel pour les 5 critères principaux (nomCapital connu)
const CAPITAL_TO_SLUG: Record<string, string> = {
  'INTERFACE':       'interface',
  'FONCTIONNALITES': 'fonctionnalites',
  'FONCTIONNALITÉS': 'fonctionnalites',
  'FIABILITE':       'fiabilite',
  'FIABILITÉ':       'fiabilite',
  'EDITEUR':         'editeur',
  'ÉDITEUR':         'editeur',
  'RAPPORT QUALITE': 'qualite_prix',
  'QUALITE PRIX':    'qualite_prix',
  'QUALITÉ/PRIX':    'qualite_prix',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveSlug(nomCapital: string | undefined, nomCourt: string | undefined): string {
  if (nomCapital) {
    const upper = nomCapital.toUpperCase().trim()
    // Cherche une correspondance dans le mapping manuel
    for (const [key, slug] of Object.entries(CAPITAL_TO_SLUG)) {
      if (upper.includes(key)) return slug
    }
    return slugify(nomCapital)
  }
  return slugify(nomCourt || 'inconnu')
}

async function main() {
  console.log('🚀 remap-scores-numeriques\n')

  // 1. Charger les critères Firebase
  console.log('📥 Chargement critères Firebase...')
  const snapshot = await firestore.collection('criteres').get()
  const criteres = snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() } as any))

  // Construire le mapping : identifiantTech numérique → slug textuel
  const numToSlug: Record<string, string> = {}
  for (const c of criteres) {
    const tech = String(c.identifiantTech || '').trim()
    if (!tech || !/^\d+$/.test(tech)) continue // garder seulement les numériques
    numToSlug[tech] = resolveSlug(c.nomCapital, c.nomCourt)
  }

  console.log(`  ${Object.keys(numToSlug).length} critères avec identifiantTech numérique`)
  console.log('\n  Mapping des 5 critères principaux :')
  for (const [num, slug] of Object.entries(numToSlug).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 10)) {
    console.log(`    "${num}" → "${slug}"`)
  }

  // 2. Charger toutes les évaluations Supabase
  console.log('\n📥 Chargement évaluations Supabase...')
  const allEvals: Array<{ id: string; scores: Record<string, unknown> }> = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('evaluations')
      .select('id, scores')
      .range(offset, offset + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const e of data) {
      allEvals.push({ id: e.id, scores: (e.scores as Record<string, unknown>) || {} })
    }
    offset += 1000
    if (data.length < 1000) break
  }
  console.log(`  ${allEvals.length} évaluations chargées`)

  // 3. Identifier et remapper les évaluations avec clés numériques
  const toUpdate: Array<{ id: string; scores: Record<string, unknown> }> = []

  for (const ev of allEvals) {
    const keys = Object.keys(ev.scores).filter(k => k !== 'commentaire')
    if (keys.length === 0) continue
    const hasNumeric = keys.some(k => /^\d+$/.test(k))
    if (!hasNumeric) continue

    const newScores: Record<string, unknown> = {}
    let changed = false

    for (const [key, val] of Object.entries(ev.scores)) {
      if (/^\d+$/.test(key)) {
        const newKey = numToSlug[key] || `detail_${key}`
        newScores[newKey] = val
        if (newKey !== key) changed = true
      } else {
        newScores[key] = val // conserver les clés non-numériques (commentaire, etc.)
      }
    }

    if (changed) toUpdate.push({ id: ev.id, scores: newScores })
  }

  console.log(`\n  ${toUpdate.length} évaluations à remapper`)

  // Aperçu
  if (toUpdate.length > 0) {
    const sample = toUpdate[0]
    const before = Object.keys(allEvals.find(e => e.id === sample.id)!.scores).filter(k => k !== 'commentaire').slice(0, 5)
    const after = Object.keys(sample.scores).filter(k => k !== 'commentaire').slice(0, 5)
    console.log(`\n  Exemple (eval ${sample.id.slice(0, 8)}...) :`)
    console.log(`    Avant : ${before.join(', ')}`)
    console.log(`    Après : ${after.join(', ')}`)
  }

  if (DRY_RUN) {
    console.log('\n  ⚠️  Relancer sans --dry-run pour appliquer')
    return
  }

  // 4. Mise à jour
  console.log('\n✏️  Mise à jour...')
  let done = 0, errors = 0
  for (const { id, scores } of toUpdate) {
    const { error } = await supabase.from('evaluations').update({ scores }).eq('id', id)
    if (error) { console.error(`  ❌ ${id}: ${error.message}`); errors++ }
    else {
      done++
      if (done % 100 === 0) console.log(`  ... ${done}/${toUpdate.length}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Résumé')
  console.log('='.repeat(50))
  console.log(`  Évaluations remappées : ${done}`)
  console.log(`  Erreurs               : ${errors}`)
  if (done > 0) console.log('\n  ✅ Les critères apparaîtront dans les témoignages')
}

main().catch(err => { console.error('\n💥', err); process.exit(1) })
