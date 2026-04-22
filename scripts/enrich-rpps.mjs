/**
 * Enrichissement des profils RPPS depuis l'API Tabulaire data.gouv.fr
 *
 * Aucune clé API requise. Utilise le fichier PS_LibreAcces_Personne_activite
 * exposé via l'API tabulaire de data.gouv.fr.
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/enrich-rpps.mjs
 *
 * Sortie :
 *   - Affiche les UPDATE SQL à coller dans l'éditeur SQL Supabase
 *   - Liste les RPPS sans correspondance dans la base RASS
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Chargement du .env.local ──────────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

// ── Configuration ─────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes dans .env.local')
  process.exit(1)
}

// Resource ID du fichier PS_LibreAcces_Personne_activite sur data.gouv.fr
const RESOURCE_ID = 'fffda7e9-0ea2-4c35-bba0-4496f3af935d'
const API_BASE    = `https://tabular-api.data.gouv.fr/api/resources/${RESOURCE_ID}/data/`

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchByRpps(rpps) {
  // "Identifiant PP" est le nom exact de la colonne RPPS dans le fichier
  const url = `${API_BASE}?${encodeURIComponent('Identifiant PP')}__exact=${rpps}&page_size=1`

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  HTTP ${res.status} pour RPPS ${rpps}`)
    return null
  }

  const json = await res.json()
  const row = json?.data?.[0]
  if (!row) return null

  const nom    = row["Nom d'exercice"]?.trim()    || null
  const prenom = row["Prénom d'exercice"]?.trim() || null

  return { nom, prenom }
}

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false },
  })

  // 1. Récupérer les users avec RPPS mais sans nom
  const { data: users, error } = await supabase
    .from('users')
    .select('id, rpps, nom, prenom')
    .not('rpps', 'is', null)
    .is('nom', null)

  if (error) {
    console.error('Erreur Supabase :', error.message)
    process.exit(1)
  }

  console.log(`\n${users.length} utilisateur(s) avec RPPS mais sans nom.\n`)
  if (users.length === 0) {
    console.log('Rien à faire.')
    process.exit(0)
  }

  const updates  = []
  const notFound = []

  // 2. Interroger l'API pour chaque RPPS
  for (const user of users) {
    process.stdout.write(`  RPPS ${user.rpps} ... `)

    const result = await fetchByRpps(user.rpps)

    if (!result || (!result.nom && !result.prenom)) {
      console.log('non trouvé')
      notFound.push(user.rpps)
    } else {
      console.log(`${result.prenom ?? '?'} ${result.nom ?? '?'}`)
      updates.push({ id: user.id, rpps: user.rpps, ...result })
    }

    // Pause légère pour respecter les rate limits (100 req/s max)
    await new Promise((r) => setTimeout(r, 100))
  }

  // 3. Appliquer les mises à jour directement dans Supabase
  if (updates.length > 0) {
    console.log('\n── Application des mises à jour dans Supabase ────────────────────\n')
    let ok = 0
    let ko = 0
    for (const u of updates) {
      const { error } = await supabase
        .from('users')
        .update({ nom: u.nom, prenom: u.prenom })
        .eq('id', u.id)

      if (error) {
        console.error(`  ✗ ${u.rpps} — ${error.message}`)
        ko++
      } else {
        console.log(`  ✓ ${u.prenom} ${u.nom} (RPPS ${u.rpps})`)
        ok++
      }
    }
    console.log(`\n  ${ok} mis à jour, ${ko} erreurs.`)
  }

  if (notFound.length > 0) {
    console.log('\n── RPPS sans correspondance dans la base RASS ────────────────────\n')
    notFound.forEach((r) => console.log(`  ${r}`))
  }

  console.log(`\nTerminé : ${updates.length} écrits, ${notFound.length} non trouvés.\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
