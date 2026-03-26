import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ─── Firebase init ───────────────────────────────────────────
const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

// ─── Supabase init (service role = bypass RLS) ──────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function toISOString(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString()
  if (typeof val === 'string' && val.length > 0) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

async function main() {
  console.log('📥 Chargement des users Firebase...')
  const snapshot = await firestore.collection('users').get()
  const fbUsers = snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() }))
  console.log(`  ${fbUsers.length} users trouvés dans Firebase\n`)

  // Construire le mapping rpps → creation depuis Firebase
  const rppsToCreation: Record<string, string> = {}
  let skipped = 0
  for (const u of fbUsers) {
    const d = u as any
    const rpps = d.rpps || u._fid
    const createdAt = toISOString(d.creation)
    if (createdAt) {
      rppsToCreation[rpps] = createdAt
    } else {
      skipped++
    }
  }
  console.log(`  ${Object.keys(rppsToCreation).length} users avec date de création, ${skipped} sans date\n`)

  // Mettre à jour directement dans Supabase par rpps
  let updated = 0
  let notFound = 0
  let errors = 0

  for (const [rpps, createdAt] of Object.entries(rppsToCreation)) {
    const { data, error } = await supabase
      .from('users')
      .update({ created_at: createdAt })
      .eq('rpps', rpps)
      .select('id, rpps, created_at')

    if (error) {
      errors++
      if (errors <= 5) console.error(`  ❌ Erreur update rpps ${rpps}: ${error.message}`)
      continue
    }

    if (!data || data.length === 0) {
      notFound++
      if (notFound <= 5) console.log(`  ⚠️ rpps ${rpps} non trouvé dans Supabase`)
      continue
    }

    updated++
    if (updated <= 3) console.log(`  ✔ rpps ${rpps} → created_at = ${createdAt}`)
    if (updated % 100 === 0) console.log(`  ... ${updated} mis à jour`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Terminé !')
  console.log(`  Mis à jour:    ${updated}`)
  console.log(`  Sans date:     ${skipped}`)
  console.log(`  Non trouvés:   ${notFound}`)
  console.log(`  Erreurs:       ${errors}`)
  console.log('='.repeat(50))
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale:', err)
  process.exit(1)
})
