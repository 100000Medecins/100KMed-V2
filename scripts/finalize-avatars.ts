/**
 * Finalise les avatars triés :
 * - trie médicaux d'abord (par ID), puis décalés (par ID)
 * - renomme en avatar-1.png à avatar-N.png
 * - upscale x2 nearest neighbor (128×128 → 256×256, pixel-perfect)
 *
 * Usage : npx tsx scripts/finalize-avatars.ts
 *
 * Entrée : out/avatars/selected/
 * Sortie : out/avatars/final/avatar-1.png ... avatar-N.png (256×256)
 *          + out/avatars/final-mapping.json (mapping numéro → fichier source)
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import sharp from 'sharp'

const argSrc = process.argv.find((a) => a.startsWith('--src='))?.split('=')[1] ?? 'selected'
const argDst = process.argv.find((a) => a.startsWith('--dst='))?.split('=')[1] ?? 'final'
const SRC = path.join(process.cwd(), 'out', 'avatars', argSrc)
const DST = path.join(process.cwd(), 'out', 'avatars', argDst)

function extractId(filename: string, prefix: 'med' | 'geek'): number {
  const m = filename.match(new RegExp(`^${prefix}-(\\d+)-`))
  return m ? Number(m[1]) : 9999
}

async function main() {
  await fs.mkdir(DST, { recursive: true })

  const files = await fs.readdir(SRC)
  const pngs = files.filter((f) => f.endsWith('.png'))

  const meds = pngs
    .filter((f) => f.startsWith('med-'))
    .sort((a, b) => extractId(a, 'med') - extractId(b, 'med'))
  const geeks = pngs
    .filter((f) => f.startsWith('geek-'))
    .sort((a, b) => extractId(a, 'geek') - extractId(b, 'geek'))

  const sorted = [...meds, ...geeks]
  console.log(`Found ${sorted.length} avatars (${meds.length} medical + ${geeks.length} geek)`)
  console.log('')

  const mapping: Record<string, { number: number; source: string; type: 'medical' | 'geek' }> = {}

  for (let i = 0; i < sorted.length; i++) {
    const source = sorted[i]
    const number = i + 1
    const dstFile = `avatar-${number}.png`
    const type = source.startsWith('med-') ? 'medical' : 'geek'

    await sharp(path.join(SRC, source))
      .resize(256, 256, { kernel: 'nearest' })
      .png()
      .toFile(path.join(DST, dstFile))

    mapping[dstFile] = { number, source, type }
    console.log(`avatar-${String(number).padStart(2, '0')}.png  ←  ${source}`)
  }

  await fs.writeFile(
    path.join(DST, '..', 'final-mapping.json'),
    JSON.stringify(mapping, null, 2),
  )
  console.log('')
  console.log(`Done. ${sorted.length} files in ${DST}`)
  console.log(`Mapping saved to out/avatars/final-mapping.json`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
