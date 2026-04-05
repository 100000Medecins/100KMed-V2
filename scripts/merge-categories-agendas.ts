/**
 * Script de fusion des catégories "Agenda médical" et "Agendas médicaux"
 * Usage : npx tsx scripts/merge-categories-agendas.ts [--dry-run]
 *
 * Garde "Agenda médical" (l'ancienne, visible dans l'admin).
 * Fusionne dedans toutes les solutions de "Agendas médicaux".
 * Pour les doublons cross-catégories : met à jour l'ancienne solution avec les données
 * du 2e import (description, éditeur, website), puis supprime le doublon.
 * Transfère aussi les tags de "Agendas médicaux" vers "Agenda médical".
 * Supprime enfin la catégorie "Agendas médicaux" devenue vide.
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

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

async function main() {
  // 1. Trouver les deux catégories
  const { data: categories } = await supabase.from('categories').select('id, nom, slug')

  const catOld = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '') === normalizeKey('Agenda médical')
  )
  const catNew = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '') === normalizeKey('Agendas médicaux')
  )

  if (!catOld) { console.error('❌ Catégorie "Agenda médical" introuvable.'); process.exit(1) }
  if (!catNew) { console.error('❌ Catégorie "Agendas médicaux" introuvable.'); process.exit(1) }

  console.log(`✅ Catégorie cible  : "${catOld.nom}" (${catOld.id})`)
  console.log(`✅ Catégorie source : "${catNew.nom}" (${catNew.id})\n`)

  // 2. Récupérer toutes les solutions des deux catégories
  const { data: solsOld } = await supabase
    .from('solutions')
    .select('id, nom, description, website, id_editeur, actif, slug')
    .eq('id_categorie', catOld.id)

  const { data: solsNew } = await supabase
    .from('solutions')
    .select('id, nom, description, website, id_editeur, actif, slug')
    .eq('id_categorie', catNew.id)

  console.log(`📋 "${catOld.nom}" : ${solsOld?.length ?? 0} solutions`)
  console.log(`📋 "${catNew.nom}" : ${solsNew?.length ?? 0} solutions\n`)

  // Index des solutions de l'ancienne catégorie par nom normalisé
  const oldMap = new Map<string, (typeof solsOld)[number]>()
  for (const s of solsOld ?? []) {
    oldMap.set(normalizeKey(s.nom ?? ''), s)
  }

  let merged = 0
  let moved = 0
  let deleted = 0

  // 3. Traiter chaque solution de "Agendas médicaux"
  console.log('── Traitement des solutions ──────────────────\n')

  for (const newSol of solsNew ?? []) {
    const normNom = normalizeKey(newSol.nom ?? '')
    const oldSol = oldMap.get(normNom)

    if (oldSol) {
      // DOUBLON cross-catégorie : mettre à jour l'ancienne avec les données du 2e import
      log(`  [MERGE] "${newSol.nom}"`)
      log(`    → Met à jour "${oldSol.nom}" (${oldSol.id}) avec description/éditeur/website du 2e import`)
      log(`    → Supprime le doublon (${newSol.id})`)

      if (!DRY_RUN) {
        // Mettre à jour l'ancienne solution avec les données plus récentes
        await supabase
          .from('solutions')
          .update({
            description: newSol.description ?? oldSol.description,
            website: newSol.website ?? oldSol.website,
            id_editeur: newSol.id_editeur ?? oldSol.id_editeur,
          })
          .eq('id', oldSol.id)

        // Transférer les tags du doublon vers l'ancienne
        const { data: newTags } = await supabase
          .from('solutions_tags')
          .select('id_tag, is_tag_principal')
          .eq('id_solution', newSol.id)

        for (const tag of newTags ?? []) {
          if (!tag.id_tag) continue
          const { data: existing } = await supabase
            .from('solutions_tags')
            .select('id')
            .eq('id_solution', oldSol.id)
            .eq('id_tag', tag.id_tag)
            .maybeSingle()

          if (!existing) {
            await supabase.from('solutions_tags').insert({
              id: crypto.randomUUID(),
              id_solution: oldSol.id,
              id_tag: tag.id_tag,
              enabled: true,
              is_tag_principal: tag.is_tag_principal ?? false,
            })
          }
        }

        // Supprimer les tags puis le doublon
        await supabase.from('solutions_tags').delete().eq('id_solution', newSol.id)
        await supabase.from('solutions').delete().eq('id', newSol.id)
        deleted++
      }
      merged++
    } else {
      // Pas de doublon : déplacer vers "Agenda médical"
      log(`  [MOVE]  "${newSol.nom}" → "${catOld.nom}"`)

      if (!DRY_RUN) {
        await supabase
          .from('solutions')
          .update({ id_categorie: catOld.id })
          .eq('id', newSol.id)
      }
      moved++
    }
  }

  // 4. Transférer les tags de "Agendas médicaux" vers "Agenda médical"
  console.log('\n── Transfert des tags ────────────────────────\n')

  const { data: tagsNew } = await supabase
    .from('tags')
    .select('id, libelle, ordre')
    .eq('id_categorie', catNew.id)

  const { data: tagsOld } = await supabase
    .from('tags')
    .select('id, libelle, ordre')
    .eq('id_categorie', catOld.id)

  const tagsOldMap = new Map<string, string>() // normalizedLibelle → id
  for (const t of tagsOld ?? []) {
    tagsOldMap.set(normalizeKey(t.libelle ?? ''), t.id)
  }

  const tagIdMap = new Map<string, string>() // old tag id → new tag id (in catOld)

  for (const tag of tagsNew ?? []) {
    const norm = normalizeKey(tag.libelle ?? '')
    if (tagsOldMap.has(norm)) {
      // Tag déjà présent dans "Agenda médical"
      log(`  [TAG EXISTS] "${tag.libelle}" déjà présent dans "${catOld.nom}"`)
      tagIdMap.set(tag.id, tagsOldMap.get(norm)!)
    } else {
      // Nouveau tag à créer dans "Agenda médical"
      log(`  [TAG CREATE] "${tag.libelle}" → "${catOld.nom}"`)
      if (!DRY_RUN) {
        const newId = crypto.randomUUID()
        const { error } = await supabase.from('tags').insert({
          id: newId,
          id_categorie: catOld.id,
          libelle: tag.libelle,
          ordre: tag.ordre,
        })
        if (!error) {
          tagIdMap.set(tag.id, newId)
          tagsOldMap.set(norm, newId)
        }
      } else {
        tagIdMap.set(tag.id, `DRY-${tag.id}`)
      }
    }
  }

  // 5. Mettre à jour les solutions_tags qui pointent vers les anciens tag ids
  if (!DRY_RUN) {
    for (const [oldTagId, newTagId] of tagIdMap) {
      if (oldTagId === newTagId) continue // tag déjà dans la bonne catégorie, pas besoin de migrer
      // Les solutions de "Agendas médicaux" ont été déplacées, leurs tags_ids pointent vers l'ancien tag
      // → on repointe vers le tag équivalent dans "Agenda médical"
      await supabase
        .from('solutions_tags')
        .update({ id_tag: newTagId })
        .eq('id_tag', oldTagId)
    }

    // Supprimer les tags de "Agendas médicaux"
    for (const tag of tagsNew ?? []) {
      await supabase.from('tags').delete().eq('id', tag.id)
    }
  }

  // 6. Supprimer la catégorie "Agendas médicaux" (maintenant vide)
  console.log('\n── Suppression catégorie source ──────────────\n')
  log(`  [DELETE] Catégorie "${catNew.nom}" (${catNew.id})`)

  if (!DRY_RUN) {
    await supabase.from('categories').delete().eq('id', catNew.id)
  }

  // Résumé
  console.log('\n─────────────────────────────────────────')
  console.log(`🔀 Doublons fusionnés  : ${merged}`)
  console.log(`📦 Solutions déplacées : ${moved}`)
  if (!DRY_RUN) {
    console.log(`🗑  Doublons supprimés  : ${deleted}`)
    console.log('\n✅ Fusion terminée. La catégorie "Agendas médicaux" a été supprimée.')
  } else {
    console.log('\n⚠️  Mode dry-run : aucune donnée modifiée.')
    console.log('   Relancez sans --dry-run pour effectuer la fusion.')
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e)
  process.exit(1)
})
