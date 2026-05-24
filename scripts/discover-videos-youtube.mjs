/**
 * Découverte de vidéos YouTube pour les solutions du site.
 *
 * Interroge l'API YouTube Data v3, filtre les résultats pertinents, et insère
 * les survivants dans `videos` (statut='en_attente') + `video_solutions`.
 * La validation finale se fait via le VideosPendingPanel de l'admin.
 *
 * Usage :
 *   node scripts/discover-videos-youtube.mjs
 *     → Mode interactif : prompt pour choisir la solution
 *
 *   node scripts/discover-videos-youtube.mjs --solution-id=<uuid>
 *     → Skip le prompt, cible directement la solution
 *
 *   node scripts/discover-videos-youtube.mjs --solution-id=<uuid> --max=8 --dry-run
 *     → Voir ce qui serait inséré sans rien écrire en BDD
 *
 * Variables d'environnement requises (lues depuis .env.local) :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - YOUTUBE_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

// ── Chargement du .env.local ──────────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const YOUTUBE_API_KEY  = process.env.YOUTUBE_API_KEY           || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('❌ Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
  process.exit(1)
}
if (!YOUTUBE_API_KEY) {
  console.error('❌ Manque YOUTUBE_API_KEY dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ── Parsing CLI ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`))
  return found ? found.split('=').slice(1).join('=') : null
}
const SOLUTION_ID   = getArg('solution-id')
const SOLUTION_NAME = getArg('solution-name')
const MAX_VIDEOS    = parseInt(getArg('max') || '3', 10)
const DRY_RUN       = args.includes('--dry-run')
const AUTO_YES      = args.includes('--yes')

// ── Helpers ───────────────────────────────────────────────────────────────────

const ask = (question) => new Promise((res) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question(question, (answer) => { rl.close(); res(answer.trim()) })
})

const log = (...args) => console.log(...args)
const warn = (...args) => console.warn('⚠️ ', ...args)

// Convertit la durée ISO 8601 (PT4M13S) en secondes
const parseDuration = (iso) => {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const [, h, mn, s] = m
  return (parseInt(h || 0) * 3600) + (parseInt(mn || 0) * 60) + parseInt(s || 0)
}

// ── Étape 1 : sélection de la solution ────────────────────────────────────────

async function selectSolution() {
  if (SOLUTION_ID) {
    const { data, error } = await supabase
      .from('solutions')
      .select('id, nom, slug, actif, id_categorie, categories(nom)')
      .eq('id', SOLUTION_ID)
      .single()
    if (error || !data) {
      console.error(`❌ Solution ${SOLUTION_ID} introuvable :`, error?.message)
      process.exit(1)
    }
    return data
  }

  const term = SOLUTION_NAME || await ask('Nom de solution à chercher (ex: doctolib) : ')
  if (!term) { console.error('❌ Saisie vide'); process.exit(1) }

  const { data, error } = await supabase
    .from('solutions')
    .select('id, nom, slug, actif, id_categorie, categories(nom)')
    .ilike('nom', `%${term}%`)
    .eq('actif', true)
    .order('nom')

  if (error) { console.error('❌ Erreur SQL :', error.message); process.exit(1) }
  if (!data || data.length === 0) { console.error(`❌ Aucune solution active ne matche "${term}"`); process.exit(1) }

  log(`\n${data.length} solution(s) trouvée(s) :\n`)
  data.forEach((s, i) => {
    log(`  [${i + 1}] ${s.nom}  (catégorie: ${s.categories?.nom || '?'}, slug: ${s.slug})`)
  })

  // Si une seule correspondance ET --solution-name passé → auto-sélection
  if (data.length === 1 && SOLUTION_NAME) {
    log(`\n→ Auto-sélection (seul résultat)`)
    return data[0]
  }

  const choice = await ask('\nNuméro à cibler (ou Ctrl+C pour annuler) : ')
  const idx = parseInt(choice, 10) - 1
  if (isNaN(idx) || idx < 0 || idx >= data.length) {
    console.error('❌ Choix invalide')
    process.exit(1)
  }
  return data[idx]
}

// ── Étape 2 : recherche YouTube ───────────────────────────────────────────────

async function searchYouTube(solutionName) {
  // Requête orientée public médecin/professionnel de santé
  const query = `"${solutionName}" (médecin OR "professionnel de santé" OR cabinet OR "logiciel médical") (tutoriel OR démonstration OR avis OR "prise en main" OR "comment utiliser")`
  log(`\n🔎 Requête YouTube : ${query}`)

  // Étape 2a : search.list pour récupérer les IDs des 20 premiers résultats
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY)
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('maxResults', '20')
  searchUrl.searchParams.set('relevanceLanguage', 'fr')
  searchUrl.searchParams.set('regionCode', 'FR')
  searchUrl.searchParams.set('safeSearch', 'strict')
  searchUrl.searchParams.set('order', 'relevance')
  searchUrl.searchParams.set('videoDuration', 'medium')

  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    const body = await searchRes.text()
    console.error(`❌ YouTube search ${searchRes.status} :`, body)
    process.exit(1)
  }
  const searchData = await searchRes.json()
  const ids = (searchData.items || []).map((it) => it.id.videoId).filter(Boolean)
  log(`   → ${ids.length} candidats bruts retournés par YouTube`)

  if (ids.length === 0) return []

  // Étape 2b : videos.list pour récupérer durée, vues, date complète
  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  videosUrl.searchParams.set('key', YOUTUBE_API_KEY)
  videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics')
  videosUrl.searchParams.set('id', ids.join(','))

  const videosRes = await fetch(videosUrl)
  if (!videosRes.ok) {
    const body = await videosRes.text()
    console.error(`❌ YouTube videos ${videosRes.status} :`, body)
    process.exit(1)
  }
  const videosData = await videosRes.json()
  return videosData.items || []
}

// ── Étape 3 : filtrage + scoring ──────────────────────────────────────────────

// Mots qui trahissent une vidéo orientée dev / scraping / hack — pas pour des médecins
const BLACKLIST_TERMS = [
  'laravel', 'react', 'vue.js', 'angular', 'django', 'flask', 'nodejs', 'node.js',
  'scraper', 'scraping', 'scrape',
  'clone', 'cloner', 'reproduire',
  'api rest', 'tutorial code', 'développeur', 'developpeur',
  'reverse engineering', 'hack',
]

// Mots qui signalent un contenu orienté professionnel de santé
const PRO_SANTE_TERMS = [
  'médecin', 'medecin', 'praticien', 'cabinet', 'patientèle', 'patientele',
  'professionnel de santé', 'professionnel sante',
  'infirmier', 'infirmière', 'infirmiere', 'kiné', 'kine',
  'logiciel médical', 'logiciel medical', 'téléconsultation', 'teleconsultation',
  'consultation', 'rendez-vous', 'planning', 'agenda médical', 'agenda medical',
]

function filterAndScore(items, solutionName) {
  const nowMs = Date.now()
  const fiveYearsMs = 5 * 365 * 24 * 3600 * 1000
  const nameLower = solutionName.toLowerCase()

  const survivors = []
  const rejected = { dureeCourte: 0, vuesFaibles: 0, tropAncien: 0, nomAbsent: 0, blacklist: 0 }

  for (const it of items) {
    const durationS = parseDuration(it.contentDetails?.duration)
    const views = parseInt(it.statistics?.viewCount || '0', 10)
    const publishedMs = new Date(it.snippet?.publishedAt).getTime()
    const title = it.snippet?.title || ''
    const description = it.snippet?.description || ''
    const haystack = `${title} ${description}`.toLowerCase()

    if (durationS < 60)                      { rejected.dureeCourte++; continue }
    if (views < 100)                         { rejected.vuesFaibles++; continue }
    if (nowMs - publishedMs > fiveYearsMs)   { rejected.tropAncien++; continue }
    if (!haystack.includes(nameLower))       { rejected.nomAbsent++; continue }
    // Reject si un terme blacklisté apparaît (dev, scraping, etc.)
    if (BLACKLIST_TERMS.some((t) => haystack.includes(t))) { rejected.blacklist++; continue }

    // Score : log(vues) × récence × bonus si nom dans titre × bonus si terme pro santé présent
    const ageDays = (nowMs - publishedMs) / (24 * 3600 * 1000)
    const recencyBonus = Math.exp(-ageDays / 730) // demi-vie 2 ans
    const titleBonus = title.toLowerCase().includes(nameLower) ? 1.5 : 1.0
    const proSanteBonus = PRO_SANTE_TERMS.some((t) => haystack.includes(t)) ? 2.0 : 0.5
    const score = Math.log10(views + 1) * recencyBonus * titleBonus * proSanteBonus

    survivors.push({
      videoId: it.id,
      title,
      description: description.slice(0, 500),
      channelTitle: it.snippet?.channelTitle || '',
      publishedAt: it.snippet?.publishedAt,
      durationS,
      views,
      thumbnail: it.snippet?.thumbnails?.maxres?.url
              || it.snippet?.thumbnails?.high?.url
              || it.snippet?.thumbnails?.medium?.url
              || '',
      score,
    })
  }

  survivors.sort((a, b) => b.score - a.score)

  log(`   → ${survivors.length} survivants après filtrage`)
  log(`     (rejetés : durée<60s=${rejected.dureeCourte}, vues<100=${rejected.vuesFaibles}, >5 ans=${rejected.tropAncien}, nom absent=${rejected.nomAbsent}, blacklist dev=${rejected.blacklist})`)

  return survivors.slice(0, MAX_VIDEOS)
}

// ── Étape 4 : insertion BDD (avec dédup) ──────────────────────────────────────

async function insertVideos(survivors, solution) {
  log('')
  if (survivors.length === 0) {
    warn('Aucune vidéo retenue après filtrage. Stop.')
    return
  }

  log(`📋 Top ${survivors.length} retenu(es) pour "${solution.nom}" :\n`)
  survivors.forEach((v, i) => {
    log(`  [${i + 1}] ${v.title}`)
    log(`       📺 ${v.channelTitle} · ${Math.floor(v.durationS / 60)}min · ${v.views.toLocaleString('fr-FR')} vues`)
    log(`       🔗 https://www.youtube.com/watch?v=${v.videoId}`)
    log(`       ⭐ score=${v.score.toFixed(2)}`)
    log('')
  })

  if (DRY_RUN) {
    warn('--dry-run : aucune insertion en BDD.')
    return
  }

  if (!AUTO_YES) {
    const confirm = await ask('Confirmer l\'insertion en BDD (statut=en_attente) ? [o/N] : ')
    if (confirm.toLowerCase() !== 'o') {
      warn('Annulé.')
      return
    }
  } else {
    log('→ --yes : insertion automatique sans confirmation')
  }

  let inserted = 0
  let skipped = 0

  for (const v of survivors) {
    const url = `https://www.youtube.com/watch?v=${v.videoId}`

    // Dédup : on saute si l'URL existe déjà (peu importe le statut)
    const { data: existing } = await supabase
      .from('videos')
      .select('id')
      .eq('url', url)
      .maybeSingle()

    if (existing) {
      log(`   ⏭️  Déjà en BDD : ${v.title.slice(0, 60)}…`)
      skipped++
      continue
    }

    const { data: newVideo, error: insErr } = await supabase
      .from('videos')
      .insert({
        titre: v.title,
        url,
        description: v.description,
        vignette: v.thumbnail,
        statut: 'en_attente',
        type: 'tutoriel',
        ordre: 0,
      })
      .select('id')
      .single()

    if (insErr || !newVideo) {
      warn(`Échec insert vidéo "${v.title}" :`, insErr?.message)
      continue
    }

    const { error: linkErr } = await supabase
      .from('video_solutions')
      .insert({
        video_id: newVideo.id,
        solution_id: solution.id,
        ordre: Math.round(v.score * 100), // ordre = score*100 (entier)
      })

    if (linkErr) {
      warn(`Insert lien échoué pour ${v.title} :`, linkErr.message)
      continue
    }

    inserted++
    log(`   ✅ Inséré : ${v.title.slice(0, 60)}…`)
  }

  log(`\n🎬 Bilan : ${inserted} inséré(es), ${skipped} déjà en BDD.`)
  log(`👉 Aller valider sur : /admin/videos (onglet propositions à modérer)`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log(' Découverte vidéos YouTube → videos + video_solutions')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const solution = await selectSolution()
  log(`\n✅ Cible : ${solution.nom}  (id: ${solution.id})`)

  const items = await searchYouTube(solution.nom)
  const survivors = filterAndScore(items, solution.nom)
  await insertVideos(survivors, solution)
}

main().catch((err) => { console.error('❌ Erreur fatale :', err); process.exit(1) })
