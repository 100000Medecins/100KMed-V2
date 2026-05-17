/**
 * Génération batch des avatars via API Retro Diffusion.
 * - 60 médicaux classiques (tri vers ~50)
 * - 20 archétypes geek décalés (tri vers ~15)
 *
 * Usage : npx tsx scripts/generate-avatars.ts [--variants=N] [--only=ID] [--set=med|geek]
 *
 * Prérequis :
 * - RD_API_KEY dans .env.local (récupérée depuis retrodiffusion.ai → Account → API)
 * - Crédits suffisants sur le compte RD
 *
 * Sortie :
 *   out/avatars/med-XX-vY.png   pour les médicaux
 *   out/avatars/geek-XX-vY.png  pour les décalés
 *
 * Reprise : skip si fichier existe déjà → relance OK après interruption.
 *
 * Options :
 *   --variants=N    Variantes par prompt (défaut 2)
 *   --only=ID       Ne générer qu'un seul ID (utile pour tester ou régénérer)
 *   --set=med|geek  Restreindre au sous-ensemble (défaut: les deux)
 *
 * Voir docs/avatars-prompts-theme-hospital.md pour les détails du style.
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const RD_API_KEY = process.env.RD_API_KEY
if (!RD_API_KEY) {
  console.error('Missing RD_API_KEY in .env.local')
  process.exit(1)
}

const argVariants = process.argv.find((a) => a.startsWith('--variants='))?.split('=')[1]
const argOnly = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const argSet = process.argv.find((a) => a.startsWith('--set='))?.split('=')[1]
const argStyle = process.argv.find((a) => a.startsWith('--style='))?.split('=')[1] ?? 'classic'
const argSize = Number(process.argv.find((a) => a.startsWith('--size='))?.split('=')[1] ?? 128)
const argOutdir = process.argv.find((a) => a.startsWith('--outdir='))?.split('=')[1]
const VARIANTS = Number(argVariants ?? 2)
const ONLY_ID = argOnly ? Number(argOnly) : null
const SET_FILTER = argSet === 'med' || argSet === 'geek' ? argSet : null
const PROMPT_STYLE = `rd_plus__${argStyle}`
const IMAGE_SIZE = argSize

// Output : si --outdir spécifié, sous-dossier dédié. Sinon out/avatars/ (compat ancien comportement).
const OUTPUT_DIR = argOutdir
  ? path.join(process.cwd(), 'out', 'avatars', argOutdir)
  : path.join(process.cwd(), 'out', 'avatars')
const RD_ENDPOINT = 'https://api.retrodiffusion.ai/v1/inferences'

// =============================================================================
// MÉDICAUX (60 prompts → tri vers ~50)
// =============================================================================

interface MedicalVars {
  age: 'young' | 'middle-aged' | 'senior'
  gender: 'male' | 'female' | 'androgynous'
  ethnicity: string
  hair: string
  facial: string
  glasses: 'no glasses' | 'round glasses' | 'square glasses'
  outfit: string
  expression: string
}

const MEDICAL: MedicalVars[] = [
  /*  1 */ { age: 'young',       gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'short auburn',             facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /*  2 */ { age: 'young',       gender: 'male',         ethnicity: 'caucasian pale skin',           hair: 'short dark brown',         facial: 'clean-shaven', glasses: 'square glasses', outfit: 'blue surgical scrubs',                              expression: 'neutral confident look' },
  /*  3 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'mediterranean olive skin',      hair: 'short black',              facial: 'full beard',   glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'serious focused look' },
  /*  4 */ { age: 'senior',      gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'bun grey',                 facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white coat with shirt and tie',                     expression: 'proud expression' },
  /*  5 */ { age: 'young',       gender: 'female',       ethnicity: 'north african tan skin',        hair: 'long wavy dark brown',     facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'slight polite smile' },
  /*  6 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'afro black',               facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /*  7 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian pale skin',           hair: 'bald',                     facial: 'full white beard', glasses: 'round glasses', outfit: 'white doctor coat with stethoscope',             expression: 'tired but friendly' },
  /*  8 */ { age: 'young',       gender: 'male',         ethnicity: 'east asian',                    hair: 'short black',              facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /*  9 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'south asian brown skin',        hair: 'long dark brown',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 10 */ { age: 'young',       gender: 'female',       ethnicity: 'caucasian pale skin',           hair: 'ponytail blonde',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'nurse uniform',                                     expression: 'neutral confident look' },
  /* 11 */ { age: 'senior',      gender: 'male',         ethnicity: 'mediterranean olive skin',      hair: 'salt-and-pepper short',    facial: 'moustache',    glasses: 'square glasses', outfit: 'white coat with shirt and tie',                     expression: 'raised eyebrow skeptical' },
  /* 12 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'medium length blonde',     facial: 'goatee',       glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'proud expression' },
  /* 13 */ { age: 'young',       gender: 'female',       ethnicity: 'east asian',                    hair: 'medium length black',      facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'tired but friendly' },
  /* 14 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'north african tan skin',        hair: 'short black',              facial: 'short beard',  glasses: 'no glasses',     outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /* 15 */ { age: 'senior',      gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'short grey',               facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 16 */ { age: 'young',       gender: 'male',         ethnicity: 'south asian brown skin',        hair: 'short black',              facial: 'clean-shaven', glasses: 'square glasses', outfit: 'blue surgical scrubs',                              expression: 'slight polite smile' },
  /* 17 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'caucasian pale skin',           hair: 'curly red',                facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'proud expression' },
  /* 18 */ { age: 'senior',      gender: 'male',         ethnicity: 'east asian',                    hair: 'buzz cut grey',            facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white coat with shirt and tie',                     expression: 'serious focused look' },
  /* 19 */ { age: 'young',       gender: 'female',       ethnicity: 'mediterranean olive skin',      hair: 'long dark brown',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs',                             expression: 'slight polite smile' },
  /* 20 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'sub-saharan african dark skin', hair: 'buzz cut black',           facial: 'short beard',  glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 21 */ { age: 'young',       gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'bun blonde',               facial: 'clean-shaven', glasses: 'square glasses', outfit: 'nurse uniform',                                     expression: 'tired but friendly' },
  /* 22 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'salt-and-pepper medium',   facial: 'moustache',    glasses: 'round glasses',  outfit: 'white coat with shirt and tie',                     expression: 'proud expression' },
  /* 23 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'north african tan skin',        hair: 'ponytail black',           facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 24 */ { age: 'young',       gender: 'male',         ethnicity: 'caucasian pale skin',           hair: 'medium length blonde',     facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'raised eyebrow skeptical' },
  /* 25 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'east asian',                    hair: 'short black',              facial: 'clean-shaven', glasses: 'square glasses', outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /* 26 */ { age: 'senior',      gender: 'female',       ethnicity: 'mediterranean olive skin',      hair: 'bun white',                facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 27 */ { age: 'young',       gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'afro black',               facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'proud expression' },
  /* 28 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'medium length auburn',     facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 29 */ { age: 'senior',      gender: 'male',         ethnicity: 'south asian brown skin',        hair: 'bald',                     facial: 'full grey beard', glasses: 'no glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'tired but friendly' },
  /* 30 */ { age: 'young',       gender: 'male',         ethnicity: 'north african tan skin',        hair: 'short black',              facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'nurse uniform',                                     expression: 'slight polite smile' },
  /* 31 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'caucasian pale skin',           hair: 'short red',                facial: 'short beard',  glasses: 'square glasses', outfit: 'white coat with shirt and tie',                     expression: 'raised eyebrow skeptical' },
  /* 32 */ { age: 'young',       gender: 'female',       ethnicity: 'south asian brown skin',        hair: 'long black',               facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs',                             expression: 'proud expression' },
  /* 33 */ { age: 'senior',      gender: 'female',       ethnicity: 'caucasian pale skin',           hair: 'short grey',               facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'serious focused look' },
  /* 34 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'east asian',                    hair: 'medium length black',      facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'slight polite smile' },
  /* 35 */ { age: 'young',       gender: 'male',         ethnicity: 'sub-saharan african dark skin', hair: 'short black',              facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 36 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'bald',                     facial: 'white moustache', glasses: 'no glasses', outfit: 'white coat with shirt and tie',                     expression: 'proud expression' },
  /* 37 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'mediterranean olive skin',      hair: 'bun dark brown',           facial: 'clean-shaven', glasses: 'square glasses', outfit: 'white doctor coat with stethoscope',                expression: 'tired but friendly' },
  /* 38 */ { age: 'young',       gender: 'female',       ethnicity: 'caucasian pale skin',           hair: 'curly blonde',             facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'nurse uniform',                                     expression: 'slight polite smile' },
  /* 39 */ { age: 'senior',      gender: 'male',         ethnicity: 'sub-saharan african dark skin', hair: 'short grey',               facial: 'full grey beard', glasses: 'round glasses', outfit: 'white doctor coat with stethoscope',             expression: 'serious focused look' },
  /* 40 */ { age: 'young',       gender: 'androgynous',  ethnicity: 'east asian',                    hair: 'buzz cut black',           facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs',                             expression: 'neutral confident look' },
  /* 41 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'south asian brown skin',        hair: 'short black',              facial: 'short beard',  glasses: 'square glasses', outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'proud expression' },
  /* 42 */ { age: 'young',       gender: 'female',       ethnicity: 'north african tan skin',        hair: 'medium length black',      facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 43 */ { age: 'senior',      gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'bun salt-and-pepper',      facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white coat with shirt and tie',                     expression: 'neutral confident look' },
  /* 44 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'caucasian pale skin',           hair: 'medium length dark brown', facial: 'goatee',       glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'raised eyebrow skeptical' },
  /* 45 */ { age: 'young',       gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'long black braids',        facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'proud expression' },
  /* 46 */ { age: 'senior',      gender: 'male',         ethnicity: 'mediterranean olive skin',      hair: 'bald',                     facial: 'full salt-and-pepper beard', glasses: 'round glasses', outfit: 'white doctor coat with stethoscope',     expression: 'tired but friendly' },
  /* 47 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'ponytail auburn',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /* 48 */ { age: 'young',       gender: 'male',         ethnicity: 'east asian',                    hair: 'medium length black',      facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 49 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'south asian brown skin',        hair: 'bun black',                facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'proud expression' },
  /* 50 */ { age: 'young',       gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'short blonde',             facial: 'short beard',  glasses: 'no glasses',     outfit: 'blue surgical scrubs',                              expression: 'neutral confident look' },
  /* 51 */ { age: 'senior',      gender: 'female',       ethnicity: 'east asian',                    hair: 'short white',              facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white coat with shirt and tie',                     expression: 'serious focused look' },
  /* 52 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'north african tan skin',        hair: 'short black',              facial: 'clean-shaven', glasses: 'square glasses', outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 53 */ { age: 'young',       gender: 'androgynous',  ethnicity: 'caucasian pale skin',           hair: 'short pink-dyed',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs',                             expression: 'raised eyebrow skeptical' },
  /* 54 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'medium length white',      facial: 'full white beard', glasses: 'no glasses', outfit: 'white coat with shirt and tie',                     expression: 'proud expression' },
  /* 55 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'medium length black braids', facial: 'clean-shaven', glasses: 'round glasses', outfit: 'blue surgical scrubs',                            expression: 'tired but friendly' },
  /* 56 */ { age: 'young',       gender: 'female',       ethnicity: 'mediterranean olive skin',      hair: 'ponytail black',           facial: 'clean-shaven', glasses: 'square glasses', outfit: 'nurse uniform',                                     expression: 'slight polite smile' },
  /* 57 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'buzz cut salt-and-pepper', facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /* 58 */ { age: 'young',       gender: 'female',       ethnicity: 'caucasian fair skin',           hair: 'bun red',                  facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'proud expression' },
  /* 59 */ { age: 'senior',      gender: 'female',       ethnicity: 'north african tan skin',        hair: 'short grey',               facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'tired but friendly' },
  /* 60 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'caucasian pale skin',           hair: 'long dark brown',          facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 61 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'medium length grey',       facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 62 */ { age: 'senior',      gender: 'male',         ethnicity: 'caucasian fair skin',           hair: 'short white',              facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white coat with shirt and tie',                     expression: 'slight polite smile' },
  /* 63 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'mediterranean olive skin',      hair: 'headscarf hijab beige',    facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 64 */ { age: 'young',       gender: 'female',       ethnicity: 'sub-saharan african dark skin', hair: 'headscarf hijab burgundy', facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'slight polite smile' },
  /* 65 */ { age: 'middle-aged', gender: 'male',         ethnicity: 'east asian',                    hair: 'medium length salt-and-pepper', facial: 'full beard', glasses: 'no glasses',  outfit: 'white doctor coat with stethoscope',                expression: 'proud expression' },
  /* 66 */ { age: 'young',       gender: 'female',       ethnicity: 'east asian',                    hair: 'long black',               facial: 'clean-shaven', glasses: 'square glasses', outfit: 'nurse uniform',                                     expression: 'slight polite smile' },
  /* 67 */ { age: 'senior',      gender: 'female',       ethnicity: 'east asian',                    hair: 'bun grey',                 facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'white doctor coat with stethoscope',                expression: 'neutral confident look' },
  /* 68 */ { age: 'young',       gender: 'male',         ethnicity: 'south asian brown skin',        hair: 'medium length black wavy', facial: 'clean-shaven', glasses: 'no glasses',     outfit: 'green surgical scrubs',                             expression: 'neutral confident look' },
  /* 69 */ { age: 'middle-aged', gender: 'female',       ethnicity: 'east asian',                    hair: 'ponytail black',           facial: 'clean-shaven', glasses: 'round glasses',  outfit: 'green surgical scrubs with surgical cap and mask',  expression: 'serious focused look' },
  /* 70 */ { age: 'senior',      gender: 'male',         ethnicity: 'east asian',                    hair: 'short white',              facial: 'clean-shaven', glasses: 'square glasses', outfit: 'white doctor coat with stethoscope',                expression: 'tired but friendly' },
]

function buildMedicalPrompt(v: MedicalVars): string {
  const hairPart =
    v.hair === 'bald'
      ? 'bald'
      : v.hair.startsWith('headscarf')
        ? `wearing ${v.hair}`
        : `${v.hair} hair`
  return [
    `pixel art portrait, ${v.age} ${v.gender} ${v.ethnicity} medical doctor`,
    `${hairPart}, ${v.facial}, ${v.glasses}`,
    `wearing ${v.outfit}, ${v.expression}`,
    `frontal bust portrait facing camera directly, looking straight at viewer`,
    `transparent background`,
    `Bullfrog Theme Hospital 1997 hiring screen style`,
    `strict VGA palette, flat 2d sprite, hard pixel edges, sharp clean outline`,
    `flat solid color skin, no skin texture, no gradient shading`,
    `bright cheerful retro DOS game colors, friendly face`,
    `vintage 16-bit game character portrait`,
  ].join(', ')
}

// =============================================================================
// GEEK / DÉCALÉS (20 archétypes génériques → tri vers ~15)
// =============================================================================

interface GeekChar {
  label: string         // pour le nom de fichier
  description: string   // décrit le personnage
}

const GEEK: GeekChar[] = [
  /*  1 */ { label: 'space-monk',    description: 'young space monk warrior with brown hooded robes pulled up, short brown hair visible under hood, calm focused expression, glowing blue lightsaber hilt visible at collar level' },
  /*  2 */ { label: 'furry-warrior', description: 'tall brown furry forest warrior creature face and shoulders, large expressive eyes, leather bandolier strap across chest, fierce loyal expression' },
  /*  3 */ { label: 'wise-alien',    description: 'small ancient wise green alien face with very long pointed ears, wrinkled wise face, humble brown robes at shoulders, serene knowing expression' },
  /*  4 */ { label: 'medical-robot', description: 'white and blue medical assistant robot head and torso, single round glass eye lens glowing soft blue, stethoscope around neck, friendly neutral pose' },
  /*  5 */ { label: 'wizard',        description: 'old bearded wizard head and shoulders, tall pointed blue hat with golden stars, long white flowing beard down to chest, wise twinkling expression' },
  /*  6 */ { label: 'knight',        description: 'medieval armored knight in shining silver plate armor with closed visored helmet and red plume on top, serious noble bearing' },
  /*  7 */ { label: 'pirate',        description: 'bearded pirate captain with black eyepatch, red bandana, gold hoop earring, colorful parrot on shoulder, mischievous grin' },
  /*  8 */ { label: 'ninja',         description: 'stealth ninja with black hooded mask covering nose and mouth, only sharp eyes visible, focused intense expression' },
  /*  9 */ { label: 'samurai',       description: 'samurai warrior with horned black kabuto helmet, traditional dark blue kimono with red trim, stoic dignified expression' },
  /* 10 */ { label: 'cowboy',        description: 'western cowboy with brown wide-brim hat, leather vest over white shirt, neckerchief, light beard, easy-going expression' },
  /* 11 */ { label: 'vampire',       description: 'gentleman vampire with slicked back black hair, pale skin, pointed white fangs, high red cape collar, elegant sinister smile' },
  /* 12 */ { label: 'astronaut',     description: 'astronaut with white space helmet, gold-tinted reflective visor, white spacesuit with NASA-style patches, confident pose' },
  /* 13 */ { label: 'steampunk',     description: 'steampunk inventor with multi-lens brass goggles on forehead, leather apron over white shirt, bowtie, intrigued expression' },
  /* 14 */ { label: 'princess',      description: 'medieval princess with golden tiara on long blonde hair in elegant braid, royal blue gown with white trim, graceful smile' },
  /* 15 */ { label: 'viking',        description: 'viking warrior with horned helmet, long braided red beard and hair, fur cape over chainmail, battle-ready expression' },
  /* 16 */ { label: 'detective',     description: 'victorian detective with deerstalker hat, smoking a curved wooden pipe, tweed coat, thoughtful inquisitive expression' },
  /* 17 */ { label: 'boxer',         description: '1920s retro boxer head and shoulders, thick handlebar moustache, sleeveless striped singlet visible, determined expression' },
  /* 18 */ { label: 'witch',         description: 'young witch face and shoulders, pointed black hat, wavy black hair, small green cat perched on shoulder, playful smirk' },
  /* 19 */ { label: 'cyborg',        description: 'futuristic cyborg with half human half metal robot face, glowing red eye implant, exposed wires on neck, calm steely expression' },
  /* 20 */ { label: 'mad-scientist', description: 'mad scientist with wild electric-shock white hair, round protective goggles pushed up on forehead, white lab coat, manic gleeful smile' },
  /* 21 */ { label: 'luchador',       description: 'mexican luchador wrestler with colorful red and gold mask covering full face, only eyes and mouth visible, muscular shoulders, fierce stance' },
  /* 22 */ { label: 'pharaoh',        description: 'ancient egyptian pharaoh with golden nemes headdress with blue stripes, ceremonial false beard, royal collar with turquoise and gold, regal expression' },
  /* 23 */ { label: 'medieval-king',  description: 'medieval king with golden crown decorated with red gems, long grey beard, ermine fur cape over royal robes, dignified expression' },
  /* 24 */ { label: 'renaissance-inventor', description: 'renaissance inventor in the style of leonardo da vinci, soft velvet renaissance cap, long grey curly beard, quill pen visible, thoughtful expression' },
  /* 25 */ { label: 'yeti',           description: 'yeti abominable snowman creature with shaggy white fur, large round black eyes, gentle curious expression, snowflakes on fur' },
  /* 26 */ { label: 'surfer',         description: 'cool young surfer with sun-bleached blonde wavy hair, mirrored aviator sunglasses, tanned skin, sleeveless hawaiian shirt with palm tree pattern, relaxed laid-back expression' },
]

function buildGeekPrompt(c: GeekChar): string {
  return [
    `pixel art portrait of ${c.description}`,
    `frontal bust portrait facing camera directly, looking straight at viewer`,
    `head and upper shoulders only, no full body, no weapons raised above head`,
    `transparent background`,
    `Bullfrog Theme Hospital 1997 hiring screen style`,
    `strict VGA palette, flat 2d sprite, hard pixel edges, sharp clean outline`,
    `flat solid color shading, no gradient shading, no anti-aliasing`,
    `bright cheerful retro DOS game colors, friendly face`,
    `vintage 16-bit game character portrait`,
  ].join(', ')
}

// =============================================================================
// API call
// =============================================================================

async function generate(
  prefix: 'med' | 'geek',
  id: number,
  variant: number,
  prompt: string,
  label?: string,
): Promise<{ cost: number; balance: number } | null> {
  const tag = label ? `-${label}` : ''
  const filename = path.join(
    OUTPUT_DIR,
    `${prefix}-${String(id).padStart(2, '0')}${tag}-v${variant}.png`,
  )
  try {
    await fs.access(filename)
    console.log(`[${prefix} ${id}.${variant}] skip (file exists)`)
    return null
  } catch {
    /* file does not exist, proceed */
  }

  const res = await fetch(RD_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-RD-Token': RD_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      prompt_style: PROMPT_STYLE,
      num_images: 1,
      remove_bg: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[${prefix} ${id}.${variant}] HTTP ${res.status}: ${err}`)
    return null
  }

  let data: {
    base64_images?: string[]
    balance_cost?: number
    remaining_balance?: number
  }
  try {
    data = await res.json()
  } catch (e) {
    console.error(`[${prefix} ${id}.${variant}] JSON parse error:`, e)
    return null
  }

  if (!data?.base64_images?.[0]) {
    console.error(`[${prefix} ${id}.${variant}] empty/invalid response from RD — skipping`)
    return null
  }

  const buf = Buffer.from(data.base64_images[0], 'base64')
  await fs.writeFile(filename, buf)
  console.log(
    `[${prefix} ${id}.${variant}] ok — cost ${(data.balance_cost ?? 0).toFixed(3)}, balance ${(data.remaining_balance ?? 0).toFixed(2)}`,
  )
  return { cost: data.balance_cost ?? 0, balance: data.remaining_balance ?? 0 }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const runMedical = SET_FILTER === null || SET_FILTER === 'med'
  const runGeek = SET_FILTER === null || SET_FILTER === 'geek'

  let toRun: Array<{ prefix: 'med' | 'geek'; id: number; prompt: string; label?: string }> = []

  if (runMedical) {
    MEDICAL.forEach((v, i) => {
      const id = i + 1
      if (ONLY_ID && id !== ONLY_ID) return
      toRun.push({ prefix: 'med', id, prompt: buildMedicalPrompt(v) })
    })
  }
  if (runGeek) {
    GEEK.forEach((c, i) => {
      const id = i + 1
      if (ONLY_ID && id !== ONLY_ID) return
      toRun.push({ prefix: 'geek', id, prompt: buildGeekPrompt(c), label: c.label })
    })
  }

  console.log(
    `Generating ${toRun.length} prompt(s) × ${VARIANTS} variant(s) = ${toRun.length * VARIANTS} image(s)`,
  )
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('')

  let totalCost = 0
  for (const item of toRun) {
    for (let variant = 1; variant <= VARIANTS; variant++) {
      const result = await generate(item.prefix, item.id, variant, item.prompt, item.label)
      if (result) totalCost += result.cost
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log('')
  console.log(`Done. Total cost this run: ${totalCost.toFixed(2)} credits`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
