/**
 * Applique un cadre "carte épurée" arrondi avec ombre douce sur les captures
 * d'écran. Sortie PNG transparente, prête à coller sur n'importe quel fond.
 *
 * Style :
 *   - Bordure 1 px gris très clair (#e5e7eb)
 *   - Coins arrondis 24 px
 *   - Padding intérieur blanc 8 px (effet "carte flottante")
 *   - Ombre portée diffuse (sigma 30, opacity 18 %)
 *   - Marge transparente de 60 px autour pour que l'ombre ne soit pas coupée
 *
 * Entrée  : tous les .png/.jpg/.jpeg du dossier captures-brutes/
 * Sortie  : captures-encadrees/<nom>.png  (transparent autour)
 *
 * Usage : node scripts/applique-cadre.mjs
 */
import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'captures-brutes')
const OUT_DIR = path.join(ROOT, 'captures-encadrees')

// Paramètres de cadre
const PADDING = 8            // bande blanche autour de la capture
const RADIUS = 24            // arrondi des coins
const BORDER_COLOR = '#e5e7eb'
const SHADOW_MARGIN = 60     // marge transparente pour l'ombre
const SHADOW_SIGMA = 30      // diffusion de l'ombre (plus grand = plus diffus)
const SHADOW_OPACITY = 0.18  // 0 = invisible, 1 = noir plein

if (!fs.existsSync(SRC_DIR)) {
  console.error(`Dossier source manquant : ${SRC_DIR}`)
  console.error('Dépose tes captures (.png/.jpg) dans captures-brutes/ puis relance.')
  process.exit(1)
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(png|jpe?g)$/i.test(f))
if (files.length === 0) {
  console.error(`Aucune capture trouvée dans ${SRC_DIR}`)
  console.error('Formats acceptés : .png .jpg .jpeg')
  process.exit(1)
}

console.log(`Traitement de ${files.length} capture(s)…`)

for (const filename of files) {
  const inputPath = path.join(SRC_DIR, filename)
  const outputName = filename.replace(/\.(jpe?g|png)$/i, '.png')
  const outputPath = path.join(OUT_DIR, outputName)

  // Étape 1 : lire la capture et récupérer ses dimensions
  const input = sharp(inputPath)
  const meta = await input.metadata()
  const W = meta.width
  const H = meta.height

  // Étape 2 : créer une "carte" = capture + padding blanc + bordure + coins arrondis
  // On compose ça en deux temps :
  //  a) un fond blanc (W+2*P) × (H+2*P) avec bordure grise
  //  b) on superpose la capture par-dessus, centrée

  const cardW = W + 2 * PADDING
  const cardH = H + 2 * PADDING

  // Le masque arrondi (SVG) qui découpera la carte finale
  const roundMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
    </svg>`
  )

  // Bordure + fond blanc
  const cardBg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
      <rect x="0.5" y="0.5" width="${cardW - 1}" height="${cardH - 1}" rx="${RADIUS}" ry="${RADIUS}"
            fill="white" stroke="${BORDER_COLOR}" stroke-width="1"/>
    </svg>`
  )

  const captureBuffer = await input.png().toBuffer()

  // Composition : fond blanc avec bordure + capture centrée + mask arrondi
  const cardComposed = await sharp(cardBg)
    .composite([
      { input: captureBuffer, top: PADDING, left: PADDING },
      { input: roundMask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer()

  // Étape 3 : créer l'ombre portée
  // On part d'un rectangle noir arrondi de la même taille que la carte,
  // qu'on flouttera et qu'on placera derrière la carte.
  const shadowMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="${RADIUS}" ry="${RADIUS}"
            fill="rgba(0,0,0,${SHADOW_OPACITY})"/>
    </svg>`
  )

  // Étape 4 : composer le résultat final
  // Toile transparente plus grande que la carte (pour l'ombre)
  const finalW = cardW + 2 * SHADOW_MARGIN
  const finalH = cardH + 2 * SHADOW_MARGIN

  // Floute le masque d'ombre pour obtenir une vraie ombre diffuse
  const shadowBlurred = await sharp(shadowMask)
    .blur(SHADOW_SIGMA)
    .png()
    .toBuffer()

  // Composition finale : transparent + ombre floutée + carte par-dessus
  await sharp({
    create: {
      width: finalW,
      height: finalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      // ombre : légèrement décalée vers le bas pour effet réaliste
      { input: shadowBlurred, top: SHADOW_MARGIN + 6, left: SHADOW_MARGIN },
      // carte par-dessus
      { input: cardComposed, top: SHADOW_MARGIN, left: SHADOW_MARGIN },
    ])
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outputPath)

  const stats = fs.statSync(outputPath)
  const kb = (stats.size / 1024).toFixed(0)
  console.log(`OK ${filename}  →  ${path.basename(outputPath)}  (${finalW}×${finalH}, ${kb} Ko)`)
}

console.log('')
console.log(`Terminé. Les captures encadrées sont dans : ${OUT_DIR}`)
