/**
 * Génère un petit lot d'avatars test en mode plus low-res que le catalogue actuel,
 * pour comparer visuellement et décider si on veut refaire tout le set.
 *
 * Usage :
 *   # Une seule combinaison
 *   npx tsx scripts/test-avatars-lowres.ts [--style=low_res|retro|classic] [--size=32|48|64|96] [--session=NOM]
 *
 *   # Matrix : lance 5 combinaisons utiles d'un coup, dans le même dossier session
 *   npx tsx scripts/test-avatars-lowres.ts --matrix [--session=NOM]
 *
 * Défauts : --style=low_res --size=64 --session=default
 *
 * Sortie : out/avatars/lowres-test/<session>/<style>-<size>-<label>-vN.png
 *          → upscalé nearest neighbor à 256×256 (même taille que les avatars catalogue actuels).
 *
 * Coût :
 *   - Une combinaison : 6 prompts × 2 variantes = 12 images ~ 1 USD
 *   - Matrix (5 combinaisons) : 60 images ~ 5 USD
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'
import sharp from 'sharp'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const RD_API_KEY = process.env.RD_API_KEY
if (!RD_API_KEY) {
  console.error('Missing RD_API_KEY in .env.local')
  process.exit(1)
}

const argStyle = process.argv.find((a) => a.startsWith('--style='))?.split('=')[1] ?? 'low_res'
const argSize = Number(process.argv.find((a) => a.startsWith('--size='))?.split('=')[1] ?? 64)
const argSession = process.argv.find((a) => a.startsWith('--session='))?.split('=')[1] ?? 'default'
const argMatrix = process.argv.includes('--matrix')

const VARIANTS = 2
const RD_ENDPOINT = 'https://api.retrodiffusion.ai/v1/inferences'

// 6 prompts variés, pris du catalogue (diversité genre/âge/ethnie)
const TEST_PROMPTS = [
  {
    label: '01-young-female-fair',
    description: 'young female caucasian fair skin medical doctor, short auburn hair, no glasses, white doctor coat with stethoscope',
  },
  {
    label: '02-senior-male-bald',
    description: 'senior male caucasian pale skin medical doctor, bald, full white beard, round glasses, white doctor coat',
  },
  {
    label: '03-middle-female-african',
    description: 'middle-aged female sub-saharan african dark skin medical doctor, afro black hair, round glasses, white doctor coat with stethoscope',
  },
  {
    label: '04-young-male-asian',
    description: 'young male east asian medical doctor, short black hair, green surgical scrubs with surgical cap and mask',
  },
  {
    label: '05-middle-male-mediterranean',
    description: 'middle-aged male mediterranean olive skin medical doctor, short black hair, full beard, white doctor coat',
  },
  {
    label: '06-young-female-north-african',
    description: 'young female north african tan skin medical doctor, long wavy dark brown hair, blue surgical scrubs',
  },
]

// Combinaisons les plus utiles pour le mode --matrix
const MATRIX_COMBINATIONS: Array<{ style: string; size: number }> = [
  { style: 'low_res', size: 32 },
  { style: 'low_res', size: 64 },
  { style: 'retro', size: 32 },
  { style: 'retro', size: 64 },
  { style: 'classic', size: 48 },
]

function buildPrompt(description: string): string {
  return [
    `low resolution pixel art portrait, ${description}`,
    'frontal bust portrait facing camera directly',
    'transparent background',
    'very chunky big pixels, blocky 8-bit NES style',
    'flat solid colors, hard pixel edges, no anti-aliasing, no smooth shading',
    'retro 8-bit video game character sprite',
    'friendly face',
  ].join(', ')
}

async function generate(
  outputDir: string,
  style: string,
  size: number,
  label: string,
  variant: number,
  prompt: string,
): Promise<number> {
  const filename = path.join(outputDir, `${style}-${size}-${label}-v${variant}.png`)
  try {
    await fs.access(filename)
    console.log(`  [${style}-${size}-${label}.${variant}] skip (exists)`)
    return 0
  } catch {
    /* not exists, proceed */
  }

  const res = await fetch(RD_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-RD-Token': RD_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: size,
      height: size,
      prompt_style: `rd_plus__${style}`,
      num_images: 1,
      remove_bg: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  [${style}-${size}-${label}.${variant}] HTTP ${res.status}: ${err}`)
    return 0
  }

  const data = (await res.json()) as {
    base64_images: string[]
    balance_cost: number
    remaining_balance: number
  }

  const nativeBuffer = Buffer.from(data.base64_images[0], 'base64')

  // Upscale nearest neighbor pour comparer à la même taille (256) que les avatars actuels
  const targetSize = 256
  const upscaleFactor = Math.floor(targetSize / size)
  const finalSize = size * upscaleFactor
  const upscaled = await sharp(nativeBuffer)
    .resize(finalSize, finalSize, { kernel: 'nearest' })
    .png()
    .toBuffer()

  await fs.writeFile(filename, upscaled)
  console.log(
    `  [${style}-${size}-${label}.${variant}] ok — native ${size}px → ${finalSize}px, cost ${data.balance_cost.toFixed(3)}, balance ${data.remaining_balance.toFixed(2)}`,
  )
  return data.balance_cost
}

async function runCombination(outputDir: string, style: string, size: number): Promise<number> {
  console.log(`\n→ Combinaison : rd_plus__${style} @ ${size}×${size} (upscale x${Math.floor(256 / size)} → 256×256)`)
  let cost = 0
  for (const p of TEST_PROMPTS) {
    const prompt = buildPrompt(p.description)
    for (let variant = 1; variant <= VARIANTS; variant++) {
      cost += await generate(outputDir, style, size, p.label, variant, prompt)
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  return cost
}

async function main() {
  const outputDir = path.join(process.cwd(), 'out', 'avatars', 'lowres-test', argSession)
  await fs.mkdir(outputDir, { recursive: true })

  console.log(`Session: "${argSession}"`)
  console.log(`Output: ${outputDir}`)

  let totalCost = 0

  if (argMatrix) {
    console.log(`Mode: MATRIX (${MATRIX_COMBINATIONS.length} combinaisons × ${TEST_PROMPTS.length} prompts × ${VARIANTS} variantes = ${MATRIX_COMBINATIONS.length * TEST_PROMPTS.length * VARIANTS} images)`)
    for (const combo of MATRIX_COMBINATIONS) {
      totalCost += await runCombination(outputDir, combo.style, combo.size)
    }
  } else {
    console.log(`Mode: single (--style=${argStyle} --size=${argSize})`)
    console.log(`Prompts: ${TEST_PROMPTS.length} × ${VARIANTS} = ${TEST_PROMPTS.length * VARIANTS} images`)
    totalCost = await runCombination(outputDir, argStyle, argSize)
  }

  console.log('')
  console.log(`Done. Total cost: ${totalCost.toFixed(2)} credits`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
