/**
 * Script de déduplication des solutions "Agendas médicaux"
 * Usage : npx tsx scripts/deduplicate-agendas.ts [--dry-run]
 *
 * Fusionne les doublons issus de deux imports successifs avec des noms légèrement différents.
 * Ex : "Maiia (Cegedim)" + "Maiia" → garde "Maiia" (2e import, avec description)
 * Transfère les tags de la solution supprimée vers celle conservée.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as crypto from 'crypto'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Nom de base : supprime parenthèses, tout ce qui suit un slash ou un point d'URL */
function baseName(nom: string): string {
  return normalizeKey(
    nom
      .replace(/\s*\(.*?\)\s*/g, '')   // retire (parenthetical)
      .replace(/\s*\/.*$/, '')          // retire / et la suite
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

async function main() {
  // 1. Trouver la catégorie
  const { data: categories } = await supabase.from('categories').select('id, nom')
  const categorie = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '') === normalizeKey('Agendas médicaux')
  )
  if (!categorie) {
    console.error('❌ Catégorie "Agendas médicaux" introuvable.')
    process.exit(1)
  }
  console.log(`✅ Catégorie : ${categorie.nom} (${categorie.id})\n`)

  // 2. Récupérer toutes les solutions de la catégorie
  const { data: solutions, error } = await supabase
    .from('solutions')
    .select('id, nom, slug, description, actif, id_editeur, website')
    .eq('id_categorie', categorie.id)
    .order('nom')

  if (error || !solutions) {
    console.error('❌ Erreur récupération solutions:', error?.message)
    process.exit(1)
  }

  console.log(`📋 ${solutions.length} solutions dans la catégorie.\n`)

  // 3. Grouper par nom de base
  const groups = new Map<string, typeof solutions>()
  for (const sol of solutions) {
    const key = baseName(sol.nom || '')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(sol)
  }

  // 4. Identifier les groupes avec doublons
  const duplicates = [...groups.entries()].filter(([, sols]) => sols.length > 1)

  if (duplicates.length === 0) {
    console.log('✅ Aucun doublon détecté.')
    return
  }

  console.log(`🔍 ${duplicates.length} groupe(s) de doublons :\n`)

  let deleted = 0

  for (const [key, sols] of duplicates) {
    console.log(`  Groupe "${key}" (${sols.length} solutions) :`)
    for (const s of sols) {
      const flags = [
        s.actif ? 'actif' : 'inactif',
        s.description ? 'avec description' : 'sans description',
        s.id_editeur ? 'avec éditeur' : 'sans éditeur',
      ]
      console.log(`    - "${s.nom}" [${flags.join(', ')}]  id: ${s.id}`)
    }

    // Choisir le "keeper" : priorité à celui avec description (2e import)
    // En cas d'égalité, préférer celui sans parenthèses dans le nom (nom plus propre)
    const withDesc = sols.filter((s) => s.description)
    let keeper = withDesc.length > 0
      ? withDesc.find((s) => !s.nom?.includes('(')) ?? withDesc[0]
      : sols.find((s) => !s.nom?.includes('(')) ?? sols[sols.length - 1]

    const toDelete = sols.filter((s) => s.id !== keeper.id)

    log(`    → Conserver : "${keeper.nom}"`)
    for (const old of toDelete) {
      log(`    → Supprimer : "${old.nom}"`)

      if (!DRY_RUN) {
        // Récupérer les tags de l'ancienne solution
        const { data: oldTags } = await supabase
          .from('solutions_tags')
          .select('id_tag, is_tag_principal')
          .eq('id_solution', old.id)

        // Transférer les tags manquants vers le keeper
        for (const tag of oldTags ?? []) {
          if (!tag.id_tag) continue
          const { data: existing } = await supabase
            .from('solutions_tags')
            .select('id')
            .eq('id_solution', keeper.id)
            .eq('id_tag', tag.id_tag)
            .maybeSingle()

          if (!existing) {
            await supabase.from('solutions_tags').insert({
              id: crypto.randomUUID(),
              id_solution: keeper.id,
              id_tag: tag.id_tag,
              enabled: true,
              is_tag_principal: tag.is_tag_principal ?? false,
            })
          }
        }

        // Supprimer les tags de l'ancienne
        await supabase.from('solutions_tags').delete().eq('id_solution', old.id)

        // Supprimer l'ancienne solution
        const { error: delErr } = await supabase.from('solutions').delete().eq('id', old.id)
        if (delErr) {
          console.error(`    ❌ Erreur suppression "${old.nom}": ${delErr.message}`)
          continue
        }
        deleted++
      } else {
        deleted++
      }
    }
    console.log()
  }

  console.log('─────────────────────────────────────────')
  if (DRY_RUN) {
    console.log(`🗑  Solutions qui seraient supprimées : ${deleted}`)
    console.log('\n⚠️  Mode dry-run : aucune donnée modifiée.')
    console.log('   Relancez sans --dry-run pour fusionner.')
  } else {
    console.log(`🗑  Solutions supprimées : ${deleted}`)
    console.log('✅ Déduplication terminée.')
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e)
  process.exit(1)
})
