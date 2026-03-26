/**
 * Affiche tous les champs des évaluations Firebase pour identifier
 * la présence et le format du champ commentaire.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

async function main() {
  const snapshot = await firestore.collection('evaluations').get()
  const docs = snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() }))

  // 1. Lister tous les champs distincts
  const allKeys = new Set<string>()
  for (const d of docs as any[]) {
    for (const k of Object.keys(d)) allKeys.add(k)
  }
  console.log('\n📋 Champs présents dans les évaluations Firebase :')
  for (const k of Array.from(allKeys).sort()) console.log(`  - ${k}`)

  // 2. Chercher commentaire (direct ou dans scores)
  let withCommentaire = 0
  let withScoresCommentaire = 0
  let exemples: string[] = []

  for (const d of docs as any[]) {
    if (d.commentaire) {
      withCommentaire++
      if (exemples.length < 3) exemples.push(`[direct] "${String(d.commentaire).slice(0, 80)}"`)
    }
    if (d.scores && typeof d.scores === 'object' && d.scores.commentaire) {
      withScoresCommentaire++
      if (exemples.length < 5) exemples.push(`[scores.commentaire] "${String(d.scores.commentaire).slice(0, 80)}"`)
    }
  }

  console.log(`\n💬 Commentaires trouvés :`)
  console.log(`  - Champ direct "commentaire"    : ${withCommentaire}`)
  console.log(`  - Dans "scores.commentaire"     : ${withScoresCommentaire}`)
  if (exemples.length > 0) {
    console.log('\n  Exemples :')
    for (const e of exemples) console.log(`  ${e}`)
  } else {
    console.log('  Aucun commentaire trouvé.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
