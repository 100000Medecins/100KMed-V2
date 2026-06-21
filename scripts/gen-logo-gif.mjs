// Génère public/logos/logo-anime.gif (pour les e-mails) depuis logo-anime.svg.
// Puppeteer fige l'animation CSS image par image (Web Animations API), puis gifenc encode.
// 1ère frame = logo complet (Outlook n'affiche que la 1ère frame). Fond blanc.
//
// Usage : node scripts/gen-logo-gif.mjs [--loop=0|-1] [--width=360] [--frames=20]
import puppeteer from 'puppeteer'
import sharp from 'sharp'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc
import fs from 'fs'
import path from 'path'

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`))
  return m ? Number(m.split('=')[1]) : d
}
const W = arg('width', 360)
let H = Math.round((W * 825) / 1185) // ratio viewBox (recalculé si --trim)
const N = arg('frames', 20)
const TRIM = process.argv.includes('--trim') // rogne au plus près du logo (supprime le vide autour)
const CYCLE = 2200 // ms (durée du cycle d'animation du SVG)
const LOOP = arg('loop', 0) // 0 = boucle infinie ; -1 = joue une fois puis fige
const COMPLETE_AT = 1760 // ms : instant où le logo est "complet" (tous les textes visibles, pas de pulse)
const TRANSPARENT = process.argv.includes('--transparent')
const matteArg = process.argv.find((a) => a.startsWith('--matte='))
const MATTE = matteArg ? matteArg.split('=')[1] : null // ex. #0f1e38 : GIF opaque sur cette couleur

const root = process.cwd()
const svg = fs.readFileSync(path.join(root, 'public/logos/logo-anime.svg'), 'utf8').replace(/<\?xml[^>]*\?>/, '')

const bg = TRANSPARENT ? 'transparent' : (MATTE || '#fff')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:${bg}}
  #box{width:${W}px;height:${H}px;background:${bg}}
  #box svg{width:100%;height:100%;display:block}
</style></head><body><div id="box">${svg}</div></body></html>`

const main = async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 4 })
  await page.setContent(html, { waitUntil: 'networkidle0' })

  if (TRIM) {
    // Mesure la vraie bbox du logo et recadre le viewBox dessus (supprime le vide autour),
    // puis recalcule H selon le ratio rogné. Marge légère pour ne pas couper les ombres/bords.
    const pad = 12
    const b = await page.evaluate(() => {
      const s = document.querySelector('#box svg')
      const bb = s.getBBox()
      return { x: bb.x, y: bb.y, width: bb.width, height: bb.height }
    })
    const vbW = b.width + 2 * pad
    const vbH = b.height + 2 * pad
    H = Math.round((W * vbH) / vbW)
    const vb = `${b.x - pad} ${b.y - pad} ${vbW} ${vbH}`
    await page.evaluate((vb, h) => {
      document.querySelector('#box svg').setAttribute('viewBox', vb)
      document.querySelector('#box').style.height = h + 'px'
    }, vb, H)
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 4 })
  }
  const box = await page.$('#box')

  const frames = []
  for (let i = 0; i < N; i++) {
    const t = (i / N) * CYCLE
    await page.evaluate((tt) => {
      document.getAnimations().forEach((a) => { a.pause(); a.currentTime = tt })
    }, t)
    const png = await box.screenshot({ type: 'png', omitBackground: TRANSPARENT })
    frames.push(png)
  }
  await browser.close()

  // Rotation : démarrer sur la frame "logo complet" (pour Outlook)
  const startIdx = Math.round((COMPLETE_AT / CYCLE) * N) % N
  const ordered = frames.slice(startIdx).concat(frames.slice(0, startIdx))

  const gif = GIFEncoder()
  const delay = Math.round(CYCLE / N)
  for (let i = 0; i < ordered.length; i++) {
    // downscale net depuis le rendu 4x ; la transparence est tranchée par gifenc
    // (oneBitAlpha + clearAlphaThreshold) pour limiter le liseré, + dispose:2 entre frames.
    const { data } = await sharp(ordered[i]).resize(W, H).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const fmt = TRANSPARENT ? 'rgba4444' : 'rgb565'
    const palette = quantize(data, TRANSPARENT ? 256 : 64, { format: fmt, oneBitAlpha: TRANSPARENT, clearAlpha: TRANSPARENT, clearAlphaThreshold: 128 })
    const index = applyPalette(data, palette, fmt)
    const opts = { palette, delay }
    if (i === 0) opts.repeat = LOOP
    if (TRANSPARENT) { opts.transparent = true; opts.transparentIndex = 0; opts.dispose = 2 }
    gif.writeFrame(index, W, H, opts)
  }
  gif.finish()

  const suffix = TRIM ? '-trim' : ''
  const name = TRANSPARENT ? `logo-anime-transparent${suffix}.gif` : (MATTE ? `logo-anime-matte-${MATTE.replace('#', '')}${suffix}.gif` : `logo-anime${suffix}.gif`)
  const out = path.join(root, 'public/logos', name)
  fs.writeFileSync(out, Buffer.from(gif.bytes()))
  const kb = (fs.statSync(out).size / 1024).toFixed(0)
  console.log(`OK → ${out}  (${W}×${H}, ${N} frames, ${delay}ms/frame, loop=${LOOP}, ${kb} Ko)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
