/**
 * Recompresse en WebP les images d'un bucket Supabase Storage pour réduire l'egress.
 *
 * Contexte : les captures de galerie (bucket `media`) sont stockées en PNG/JPEG pleine
 * résolution et servies telles quelles via <img> → principal poste de « cached egress ».
 * Ce script les ré-encode en WebP redimensionné et les ré-uploade SOUS LE MÊME CHEMIN
 * (upsert) → aucune URL à changer en base, aucun code à toucher.
 *
 * - GIF (logos animés email) et SVG sont ignorés (jamais réencodés).
 * - Les images déjà plus petites après conversion sont sautées (on n'alourdit jamais).
 * - cacheControl long posé au passage (1 an) → moins de re-téléchargements navigateur.
 *
 * SÉCURITÉ : dry-run par défaut. `--execute` requis pour écrire. En mode execute, chaque
 * original est d'abord téléchargé dans storage-backups/<bucket>/<timestamp>/ (rollback),
 * + un manifest.json récapitulant tailles avant/après.
 *
 * Usage :
 *   npx tsx scripts/optimize-storage-images.ts                                  # dry-run, bucket media
 *   npx tsx scripts/optimize-storage-images.ts --bucket images                  # dry-run, bucket images
 *   npx tsx scripts/optimize-storage-images.ts --execute                        # écrit (media)
 *   npx tsx scripts/optimize-storage-images.ts --bucket media --max-width 1600 --quality 80 --execute
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ── Args ────────────────────────────────────────────────────────────────────
const EXECUTE = process.argv.includes('--execute')
function argValue(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const BUCKET = argValue('--bucket', 'media')
const MAX_WIDTH = parseInt(argValue('--max-width', '1600'), 10)
const QUALITY = parseInt(argValue('--quality', '80'), 10)
const CACHE_CONTROL = '31536000' // 1 an — les objets sont immuables (nom = hash/chemin figé)
const MIN_GAIN_BYTES = 5 * 1024 // ignore les gains < 5 Ko (pas la peine de réécrire)

const RASTER_EXT = ['.png', '.jpg', '.jpeg'] // on ne touche PAS .webp/.gif/.svg

// ── Listing récursif du bucket ──────────────────────────────────────────────
async function listAll(prefix = ''): Promise<string[]> {
  const out: string[] = []
  const PAGE = 100
  let offset = 0
  while (true) {
    const { data, error } = await s.storage.from(BUCKET).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`list("${prefix}") : ${error.message}`)
    if (!data || data.length === 0) break
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      // Un dossier n'a pas de métadonnées (id null) → on recurse dedans.
      if (entry.id === null) out.push(...(await listAll(full)))
      else out.push(full)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  return out
}

type Plan = { path: string; oldSize: number; newSize: number; buffer: Buffer }

async function main() {
  console.log(`Mode : ${EXECUTE ? '🔥 EXECUTE' : '🟢 DRY-RUN'}`)
  console.log(`Bucket : ${BUCKET} | max-width : ${MAX_WIDTH}px | quality : ${QUALITY}\n`)

  const allPaths = await listAll()
  const targets = allPaths.filter((p) => RASTER_EXT.includes(path.extname(p).toLowerCase()))
  console.log(`Objets total : ${allPaths.length} | candidats PNG/JPEG : ${targets.length}\n`)

  const plans: Plan[] = []
  let skippedSmaller = 0
  let totalOld = 0
  let totalNew = 0

  for (const p of targets) {
    const { data: blob, error } = await s.storage.from(BUCKET).download(p)
    if (error || !blob) {
      console.log(`  ⚠️  download échoué : ${p} (${error?.message})`)
      continue
    }
    const original = Buffer.from(await blob.arrayBuffer())
    let webp: Buffer
    try {
      webp = await sharp(original)
        .rotate() // respecte l'orientation EXIF avant de perdre les métadonnées
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
    } catch (e) {
      console.log(`  ⚠️  sharp a refusé ${p} : ${(e as Error).message}`)
      continue
    }

    const gain = original.length - webp.length
    if (gain < MIN_GAIN_BYTES) {
      skippedSmaller++
      continue
    }
    totalOld += original.length
    totalNew += webp.length
    plans.push({ path: p, oldSize: original.length, newSize: webp.length, buffer: webp })
  }

  // ── Rapport ────────────────────────────────────────────────────────────────
  const kb = (n: number) => `${Math.round(n / 1024)} Ko`
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} Mo`

  console.log(`=== PLAN ===`)
  console.log(`À recompresser : ${plans.length}`)
  console.log(`Sautés (déjà légers / gain < 5 Ko) : ${skippedSmaller}`)
  console.log(`Poids actuel de ces objets : ${mb(totalOld)}`)
  console.log(`Poids après WebP          : ${mb(totalNew)}`)
  if (totalOld > 0) {
    const pct = Math.round((1 - totalNew / totalOld) * 100)
    console.log(`Réduction du stockage (et de l'egress par vue) : -${pct}%\n`)
  }

  const top = [...plans].sort((a, b) => b.oldSize - a.oldSize).slice(0, 15)
  if (top.length) {
    console.log('Top 15 plus gros gains :')
    console.log('Chemin'.padEnd(52) + ' | avant → après')
    console.log('─'.repeat(80))
    for (const t of top) {
      console.log(`${t.path.slice(0, 52).padEnd(52)} | ${kb(t.oldSize)} → ${kb(t.newSize)}`)
    }
    console.log('')
  }

  if (!EXECUTE) {
    console.log('🟢 Dry-run terminé. Relancer avec --execute pour appliquer.')
    return
  }
  if (plans.length === 0) {
    console.log('Rien à écrire.')
    return
  }

  // ── Écriture ─────────────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.resolve(__dirname, `../storage-backups/${BUCKET}/${stamp}`)
  fs.mkdirSync(backupDir, { recursive: true })
  console.log(`\n🔥 EXECUTION — backup des originaux dans ${backupDir}\n`)

  const manifest: Array<{ path: string; oldSize: number; newSize: number; ok: boolean; err?: string }> = []
  let ok = 0
  let ko = 0
  for (const plan of plans) {
    // 1) backup binaire de l'original (rollback possible)
    const { data: blob } = await s.storage.from(BUCKET).download(plan.path)
    if (blob) {
      const dest = path.join(backupDir, plan.path)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, Buffer.from(await blob.arrayBuffer()))
    }
    // 2) overwrite avec le WebP (même chemin → URL inchangée), contentType WebP + cache long
    const { error } = await s.storage.from(BUCKET).upload(plan.path, plan.buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: CACHE_CONTROL,
    })
    if (error) {
      console.log(`  ❌ ${plan.path} : ${error.message}`)
      manifest.push({ path: plan.path, oldSize: plan.oldSize, newSize: plan.newSize, ok: false, err: error.message })
      ko++
    } else {
      manifest.push({ path: plan.path, oldSize: plan.oldSize, newSize: plan.newSize, ok: true })
      ok++
    }
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\n✅ ${ok} objets recompressés, ${ko} erreurs.`)
  console.log(`Économie de stockage : ${mb(totalOld - totalNew)} (${Math.round((1 - totalNew / totalOld) * 100)}%).`)
  console.log(`Backup + manifest : ${backupDir}`)
  console.log(`\n⚠️  Rollback si besoin : re-uploader les fichiers de ${backupDir} (hors manifest.json).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
