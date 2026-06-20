/**
 * Convertit les SVG du fond Hero en PNG haute résolution.
 *
 * Sorties :
 *   - exports/fond-hero-100kmed-paysage-4k.png  (3840×2160, 4K UHD paysage)
 *   - exports/fond-hero-100kmed-portrait-4k.png (2160×3840, 4K UHD portrait)
 *
 * Utilise sharp (deja installe via Next.js).
 *
 * Usage : node scripts/generate-fond-png.mjs
 */
import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const exportsDir = path.resolve(__dirname, '../exports')

const TARGETS = [
  // ─── Fond Hero (degrade navy + spots colores) ───
  {
    svgSource: path.join(exportsDir, 'fond-hero-100kmed.svg'),
    pngOutput: path.join(exportsDir, 'fond-hero-100kmed-paysage-4k.png'),
    width: 3840,
    height: 2160,
    label: 'hero paysage 4K UHD',
  },
  {
    svgSource: path.join(exportsDir, 'fond-hero-100kmed-portrait.svg'),
    pngOutput: path.join(exportsDir, 'fond-hero-100kmed-portrait-4k.png'),
    width: 2160,
    height: 3840,
    label: 'hero portrait 4K UHD',
  },
  // ─── Fond bleu clair avec petits points (surface-light + dots) ───
  {
    svgSource: path.join(exportsDir, 'fond-dots-100kmed.svg'),
    pngOutput: path.join(exportsDir, 'fond-dots-100kmed-paysage-4k.png'),
    width: 3840,
    height: 2160,
    label: 'dots paysage 4K UHD',
  },
  {
    svgSource: path.join(exportsDir, 'fond-dots-100kmed-portrait.svg'),
    pngOutput: path.join(exportsDir, 'fond-dots-100kmed-portrait-4k.png'),
    width: 2160,
    height: 3840,
    label: 'dots portrait 4K UHD',
  },
]

for (const { svgSource, pngOutput, width, height, label } of TARGETS) {
  if (!fs.existsSync(svgSource)) {
    console.error(`Manquant : ${svgSource}`)
    process.exit(1)
  }
  const svgBuffer = fs.readFileSync(svgSource)
  await sharp(svgBuffer, { density: 300 })
    .resize(width, height, { fit: 'fill' })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(pngOutput)
  const stats = fs.statSync(pngOutput)
  const kb = (stats.size / 1024).toFixed(0)
  console.log(`OK ${label} : ${path.basename(pngOutput)} (${width}×${height}, ${kb} Ko)`)
}
