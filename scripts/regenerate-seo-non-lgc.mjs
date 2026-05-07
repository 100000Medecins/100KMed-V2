/**
 * Régénère le SEO (meta title + description) pour toutes les solutions
 * dont la catégorie n'est PAS "logiciel métier" / "LGC".
 * Usage : node scripts/regenerate-seo-non-lgc.mjs
 * Options : --dry-run (affiche sans sauvegarder), --categorie "agendas-medicaux" (une seule catégorie)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { URL } from 'url'

// Charger .env.local
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const CATEGORIE_FILTER = args.includes('--categorie') ? args[args.indexOf('--categorie') + 1] : null
const DELAY_MS = 1500 // entre chaque appel API pour éviter le rate-limit

// Slugs de catégories à EXCLURE (= logiciels métier — déjà bien générés)
const SLUGS_LGC = ['logiciels-metier', 'logiciel-metier', 'lgc']

async function callAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (res.status === 429 || res.status >= 500) {
    await new Promise(r => setTimeout(r, 3000))
    return callAnthropic(prompt)
  }
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.content?.[0]?.text ?? ''
}

function parseAI(text) {
  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch { return null }
}

async function processSolution(sol) {
  const categorie = sol.categorie?.nom ?? ''
  const editeur = sol.editeur?.nom ?? ''
  const description = sol.description ?? ''
  const pointsForts = Array.isArray(sol.evaluation_redac_points_forts)
    ? sol.evaluation_redac_points_forts.slice(0, 3).join(', ')
    : ''

  // Tags principaux
  const { data: tagRows } = await supabase
    .from('solutions_tags')
    .select('id_tag')
    .eq('id_solution', sol.id)
    .eq('is_tag_principal', true)

  let tagNames = []
  if (tagRows?.length > 0) {
    const { data: tagsData } = await supabase
      .from('tags')
      .select('nom_court, nom_capital')
      .in('id', tagRows.map(r => r.id_tag).filter(Boolean))
    tagNames = (tagsData || []).map(t => t.nom_capital || t.nom_court).filter(Boolean)
  }

  const prompt = `Tu génères des métadonnées SEO pour la page d'évaluation d'un outil numérique médical sur le site 100 000 Médecins, destiné aux médecins libéraux français.

Logiciel : ${sol.nom}
Catégorie : ${categorie}${editeur ? `\nÉditeur : ${editeur}` : ''}${description ? `\nDescription : ${description.substring(0, 500)}` : ''}${tagNames.length > 0 ? `\nFonctionnalités clés : ${tagNames.join(', ')}` : ''}${pointsForts ? `\nPoints forts : ${pointsForts}` : ''}

Génère :
1. Un meta title (max 60 caractères) : doit contenir le nom du logiciel et les mots "avis" et "médecins". Utilise la catégorie réelle comme mot-clé (ex : "agenda médical", "IA scribe", "IA documentaire", "logiciel métier" uniquement si la catégorie l'est vraiment). Structure recommandée : "{Nom} — Avis médecins | {catégorie}". Adapte si le nom est long.
2. Une meta description (max 155 caractères) : décrit l'outil en lien avec sa catégorie réelle, mentionne les avis authentiques de médecins et invite à consulter la fiche. N'utilise jamais "logiciel métier" ou "lgc" si la catégorie est une IA, un agenda, ou autre chose.

Ne mentionne que des faits présents dans les données ci-dessus. Réponds UNIQUEMENT en JSON valide sans markdown :
{"title": "...", "description": "..."}`

  const text = await callAnthropic(prompt)
  const parsed = parseAI(text)
  if (!parsed?.title || !parsed?.description) {
    console.error(`  ❌ Réponse non parseable pour ${sol.nom}:`, text)
    return
  }

  console.log(`  ✓ ${sol.nom}`)
  console.log(`    Title: ${parsed.title}`)
  console.log(`    Desc:  ${parsed.description}`)

  if (!DRY_RUN) {
    const currentMeta = (sol.meta ?? {})
    await supabase
      .from('solutions')
      .update({ meta: { ...currentMeta, title: parsed.title, description: parsed.description } })
      .eq('id', sol.id)
  }
}

async function main() {
  console.log(DRY_RUN ? '🔍 Mode dry-run (pas de sauvegarde)' : '🚀 Régénération SEO en cours...')

  // Récupérer toutes les catégories pour connaître les slugs LGC
  const { data: cats } = await supabase.from('categories').select('id, nom, slug')
  const lgcIds = new Set(
    (cats || [])
      .filter(c => SLUGS_LGC.some(s => c.slug?.includes(s)) || c.nom?.toLowerCase().includes('métier') || c.nom?.toLowerCase().includes('metier'))
      .map(c => c.id)
  )

  console.log(`Catégories LGC exclues : ${[...(cats || []).filter(c => lgcIds.has(c.id)).map(c => c.nom)].join(', ')}`)

  // Fetch toutes les solutions avec leur catégorie
  let query = supabase
    .from('solutions')
    .select('id, nom, description, meta, evaluation_redac_points_forts, editeur:editeurs(nom), categorie:categories(id, nom, slug)')
    .eq('actif', true)

  if (CATEGORIE_FILTER) {
    const cat = (cats || []).find(c => c.slug === CATEGORIE_FILTER || c.nom === CATEGORIE_FILTER)
    if (!cat) { console.error(`Catégorie "${CATEGORIE_FILTER}" introuvable`); process.exit(1) }
    query = query.eq('id_categorie', cat.id)
    console.log(`Filtre catégorie : ${cat.nom}`)
  }

  const { data: solutions, error } = await query
  if (error) { console.error('Erreur Supabase:', error); process.exit(1) }

  const toProcess = (solutions || []).filter(s => {
    const catId = (s.categorie)?.id
    return CATEGORIE_FILTER || !lgcIds.has(catId)
  })

  console.log(`\n${toProcess.length} solutions à traiter\n`)

  for (let i = 0; i < toProcess.length; i++) {
    const sol = toProcess[i]
    process.stdout.write(`[${i + 1}/${toProcess.length}] `)
    try {
      await processSolution(sol)
    } catch (err) {
      console.error(`  ❌ Erreur pour ${sol.nom}:`, err.message)
    }
    if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log('\n✅ Terminé.')
}

main()
