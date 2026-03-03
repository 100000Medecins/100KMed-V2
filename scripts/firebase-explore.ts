import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'

// Charger les credentials Firebase
const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

function describeValue(val: any, depth = 0): string {
  if (val === null || val === undefined) return 'null'
  if (val instanceof Date) return 'Date'
  if (val._seconds !== undefined) return 'Timestamp'
  if (val._path !== undefined) return `Ref(${val._path?.segments?.join('/')})`
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    return `Array(${val.length}) [${describeValue(val[0], depth + 1)}, ...]`
  }
  if (typeof val === 'object' && depth < 2) {
    const keys = Object.keys(val)
    if (keys.length === 0) return '{}'
    const preview = keys.slice(0, 5).map(k => `${k}: ${describeValue(val[k], depth + 1)}`).join(', ')
    return `{${preview}${keys.length > 5 ? `, ... +${keys.length - 5}` : ''}}`
  }
  if (typeof val === 'string') return val.length > 80 ? `string(${val.length})` : `"${val}"`
  return typeof val
}

async function exploreCollection(colRef: FirebaseFirestore.CollectionReference, indent = '') {
  const snapshot = await colRef.get()
  console.log(`${indent}📁 ${colRef.id} — ${snapshot.size} documents`)

  if (snapshot.docs.length === 0) return

  // Afficher la structure du premier document
  const firstDoc = snapshot.docs[0]
  const data = firstDoc.data()
  console.log(`${indent}  📄 Premier doc (ID: ${firstDoc.id}):`)
  for (const [key, val] of Object.entries(data)) {
    console.log(`${indent}    • ${key}: ${describeValue(val)}`)
  }

  // Afficher tous les champs uniques sur l'ensemble des documents
  const allKeys = new Set<string>()
  for (const doc of snapshot.docs) {
    for (const key of Object.keys(doc.data())) {
      allKeys.add(key)
    }
  }
  const firstKeys = Object.keys(data)
  const extraKeys = [...allKeys].filter(k => !firstKeys.includes(k))
  if (extraKeys.length > 0) {
    console.log(`${indent}  ℹ️  Champs additionnels dans d'autres docs: ${extraKeys.join(', ')}`)
  }

  // Explorer les sous-collections du premier document
  const subCollections = await firstDoc.ref.listCollections()
  if (subCollections.length > 0) {
    console.log(`${indent}  📂 Sous-collections:`)
    for (const subCol of subCollections) {
      await exploreCollection(subCol, indent + '    ')
    }
  }
}

async function explore() {
  console.log('🔍 Exploration de la base Firebase Firestore\n')
  console.log('='.repeat(60))

  const collections = await db.listCollections()
  console.log(`\n${collections.length} collections trouvées au niveau racine\n`)

  for (const col of collections) {
    console.log('—'.repeat(60))
    await exploreCollection(col)
    console.log()
  }

  console.log('='.repeat(60))
  console.log('✅ Exploration terminée')
}

explore().catch(console.error)
