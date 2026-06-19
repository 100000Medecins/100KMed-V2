/**
 * Export du cluster kakemono en PNG transparent + PNG opaque + PDF haute résolution.
 *
 * Pré-requis :
 *   - Lancer `npm run dev` dans un autre terminal (le script attaque http://localhost:3000)
 *
 * Lancement :
 *   npx tsx scripts/export-kakemono-collage.ts
 *
 * Sorties (dans exports/kakemono/, dossier gitignored) :
 *   - kakemono-collage-transparent.png  → PNG transparent (à incruster dans un kakemono)
 *   - kakemono-collage.png              → PNG avec le dégradé hero (pour usage seul)
 *   - kakemono-collage.pdf              → PDF vectoriel, prêt impression
 *
 * Résolution finale : 1920×1600 px (BASE × SCALE).
 */
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

const SCALE = 4
const BASE_W = 480
const BASE_H = 400
const FINAL_W = BASE_W * SCALE
const FINAL_H = BASE_H * SCALE

const OUTPUT_DIR = path.join(process.cwd(), 'exports', 'kakemono')
const BASE_URL = 'http://localhost:3000/print/kakemono-collage'

async function checkServer() {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    console.error(`\n[ERREUR] Le dev server ne répond pas sur ${BASE_URL}`)
    console.error('  → Lance "npm run dev" dans un autre terminal puis relance ce script.\n')
    console.error('  Détail :', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

async function main() {
  await checkServer()

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: FINAL_W,
      height: FINAL_H,
      deviceScaleFactor: 1,
    },
  })

  try {
    // 1. PNG transparent — fond transparent, prêt à être incrusté dans un visuel kakemono
    console.log(`[1/3] PNG transparent (${FINAL_W}×${FINAL_H})...`)
    const pageT = await browser.newPage()
    await pageT.setViewport({ width: FINAL_W, height: FINAL_H, deviceScaleFactor: 1 })
    await pageT.goto(`${BASE_URL}?bg=transparent&scale=${SCALE}`, { waitUntil: 'networkidle0' })
    await pageT.screenshot({
      path: path.join(OUTPUT_DIR, 'kakemono-collage-transparent.png'),
      omitBackground: true,
      clip: { x: 0, y: 0, width: FINAL_W, height: FINAL_H },
    })
    await pageT.close()

    // 2. PNG opaque — avec le dégradé hero du site (utilisable seul)
    console.log(`[2/3] PNG opaque (${FINAL_W}×${FINAL_H})...`)
    const pageO = await browser.newPage()
    await pageO.setViewport({ width: FINAL_W, height: FINAL_H, deviceScaleFactor: 1 })
    await pageO.goto(`${BASE_URL}?scale=${SCALE}`, { waitUntil: 'networkidle0' })
    await pageO.screenshot({
      path: path.join(OUTPUT_DIR, 'kakemono-collage.png'),
      clip: { x: 0, y: 0, width: FINAL_W, height: FINAL_H },
    })
    await pageO.close()

    // 3. PDF — format custom à la taille du canvas, marges nulles
    console.log(`[3/3] PDF (${FINAL_W}×${FINAL_H})...`)
    const pageP = await browser.newPage()
    await pageP.setViewport({ width: FINAL_W, height: FINAL_H, deviceScaleFactor: 1 })
    await pageP.goto(`${BASE_URL}?scale=${SCALE}`, { waitUntil: 'networkidle0' })
    await pageP.pdf({
      path: path.join(OUTPUT_DIR, 'kakemono-collage.pdf'),
      width: `${FINAL_W}px`,
      height: `${FINAL_H}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    await pageP.close()

    console.log(`\n[OK] Exports terminés dans : ${OUTPUT_DIR}`)
    console.log(`     - kakemono-collage-transparent.png`)
    console.log(`     - kakemono-collage.png`)
    console.log(`     - kakemono-collage.pdf`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('[ERREUR]', err)
  process.exit(1)
})
