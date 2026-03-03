/**
 * explore-criteres-firebase.ts
 *
 * Affiche tous les champs des critères Firebase pour identifier
 * le champ numérique correspondant aux clés dans evaluations.scores
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
  const snapshot = await firestore.collection('criteres').get()
  const docs = snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() }))

  console.log(`\n${docs.length} critères trouvés\n`)
  console.log('='.repeat(80))

  for (const d of docs as any[]) {
    console.log(`\n_fid: ${d._fid}`)
    for (const [key, val] of Object.entries(d)) {
      if (key === '_fid') continue
      console.log(`  ${key}: ${JSON.stringify(val)}`)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
