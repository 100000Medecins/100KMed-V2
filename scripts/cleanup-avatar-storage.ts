/**
 * Garbage collector : supprime les fichiers PNG orphelins du bucket Supabase Storage
 * (avatars/personal/<user_id>/*.png) qui ne sont plus référencés dans la table `avatars`.
 *
 * Usage : npx tsx scripts/cleanup-avatar-storage.ts [--dry-run]
 *
 * Prérequis : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env.local
 *
 * À lancer ponctuellement (par exemple 1x par semaine ou après gros nettoyage manuel).
 * Les avatars catalogue (user_id IS NULL) sont ignorés.
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const BUCKET = 'avatars'
const ROOT = 'personal'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

async function listFilesRecursive(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error || !data) {
    console.error(`list error on "${prefix}":`, error)
    return []
  }

  const files: string[] = []
  for (const item of data) {
    const fullPath = `${prefix}/${item.name}`
    // Heuristique : un fichier a metadata != null, un dossier non.
    if (item.metadata) {
      files.push(fullPath)
    } else {
      const sub = await listFilesRecursive(fullPath)
      files.push(...sub)
    }
  }
  return files
}

async function main() {
  console.log(`Cleanup avatar storage${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // 1. Liste tous les fichiers Storage dans avatars/personal/
  const storageFiles = await listFilesRecursive(ROOT)
  console.log(`Storage files in ${BUCKET}/${ROOT}/: ${storageFiles.length}`)

  // 2. Récupère toutes les URLs perso référencées en BDD
  const { data: dbAvatars, error: dbErr } = await supabase
    .from('avatars')
    .select('url')
    .not('user_id', 'is', null)
  if (dbErr) {
    console.error('BDD query error:', dbErr)
    process.exit(1)
  }

  const dbPaths = new Set(
    (dbAvatars ?? [])
      .map((a) => {
        const m = a.url.match(/\/avatars\/(personal\/[^/]+\/[^/]+\.png)$/)
        return m ? m[1] : null
      })
      .filter((p): p is string => !!p),
  )
  console.log(`BDD references: ${dbPaths.size}`)

  // 3. Orphelins = fichiers Storage non référencés en BDD
  const orphans = storageFiles.filter((f) => !dbPaths.has(f))
  console.log(`Orphans found: ${orphans.length}`)

  if (orphans.length === 0) {
    console.log('\nRien à nettoyer.')
    return
  }

  console.log('\nOrphans:')
  orphans.forEach((f) => console.log(`  - ${f}`))

  if (DRY_RUN) {
    console.log('\n[DRY RUN] — aucun fichier supprimé')
    return
  }

  // 4. Suppression (par batchs de 100 pour respecter les limites)
  const batchSize = 100
  let deleted = 0
  for (let i = 0; i < orphans.length; i += batchSize) {
    const batch = orphans.slice(i, i + batchSize)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error(`Erreur batch ${i}:`, error)
    } else {
      deleted += batch.length
    }
  }

  console.log(`\nSupprimés : ${deleted} / ${orphans.length}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
