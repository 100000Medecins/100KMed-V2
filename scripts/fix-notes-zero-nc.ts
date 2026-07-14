/**
 * Fix « notes utilisateurs faussées » — règle « 0 = non noté » (décision 2026-07-13).
 *
 * - Non-legacy : recalcule chaque critère majeur = moyenne des scores **> 0** des évals publiées
 *   (NULL / « non noté » si aucun score positif).
 * - Legacy : **conserve** les notes figées, SAUF un critère figé à **0** (= l'ancien Firebase n'avait
 *   pas de note pour ce critère) → « non noté » (NULL). En pratique : Med'Oc / fonctionnalités.
 * - Note globale = moyenne des critères majeurs **non nuls** (recalculée pour ces solutions uniquement).
 *
 * ⚠️ Ne touche AUCUNE note figée non nulle → Premiocare, Medistory, MLM, etc. **inchangées**.
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT.
 *
 * Usage : npx tsx scripts/fix-notes-zero-nc.ts            # dry-run
 *         npx tsx scripts/fix-notes-zero-nc.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MAJEURS = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']
const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (v: number | null) => (v == null ? 'NC' : v.toFixed(2))

// Solutions concernées (liste vérifiée par les requêtes d'audit du 2026-07-13).
const SOLUTIONS = ['Sumi Health', 'Doctolib', 'MonMédecin.org', 'Tandem Health', 'Maiia', 'GPS Santé', "Med'Oc"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

async function main() {
  console.log(`\n=== Fix « 0 = non noté » — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  // Critères majeurs (tech ↔ id) + critère moyenne
  const { data: crit } = await supabase.from('criteres').select('id, identifiant_tech, type')
  const techByCritereId: Record<string, string> = {}
  let moyenneId: string | null = null
  for (const c of (crit ?? []) as Any[]) {
    if (c.type === 'moyenne') moyenneId = c.id
    if (MAJEURS.includes(c.identifiant_tech)) techByCritereId[c.id] = c.identifiant_tech
  }

  const { data: sols } = await supabase
    .from('solutions')
    .select('id, nom, is_firebase_legacy')
    .in('nom', SOLUTIONS)

  const plan: Any[] = []

  for (const sol of (sols ?? []) as Any[]) {
    const legacy = sol.is_firebase_legacy === true

    const { data: rows } = await supabase
      .from('resultats')
      .select('id, critere_id, moyenne_utilisateurs_base5, moyenne_utilisateurs, nb_notes, notes, firebase_moyenne_base5, firebase_nb_notes')
      .eq('solution_id', sol.id)

    const rowByTech: Record<string, Any> = {}
    let moyRow: Any = null
    for (const r of (rows ?? []) as Any[]) {
      if (moyenneId && r.critere_id === moyenneId) moyRow = r
      else if (techByCritereId[r.critere_id]) rowByTech[techByCritereId[r.critere_id]] = r
    }

    // Cible par critère
    const target: Record<string, { moyenne: number | null; nb: number; notes: Record<string, number> }> = {}

    if (!legacy) {
      const { data: evals } = await supabase
        .from('evaluations')
        .select('user_id, scores')
        .eq('solution_id', sol.id)
        .eq('statut', 'publiee')
        .not('user_id', 'is', null)
      for (const tech of MAJEURS) {
        const notes: Record<string, number> = {}
        for (const e of (evals ?? []) as Any[]) {
          const raw = e.scores?.[tech]
          const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
          if (!isNaN(num) && num > 0 && e.user_id) notes[e.user_id] = num // 0 = non noté → exclu
        }
        const vals = Object.values(notes)
        target[tech] = vals.length
          ? { moyenne: round2(vals.reduce((a, b) => a + b, 0) / vals.length), nb: vals.length, notes }
          : { moyenne: null, nb: 0, notes: {} }
      }
    } else {
      // Legacy : conserver la note figée, sauf un critère figé exactement à 0 → NC
      for (const tech of MAJEURS) {
        const r = rowByTech[tech]
        const cur = r ? r.moyenne_utilisateurs_base5 : null
        if (cur != null && Number(cur) === 0) target[tech] = { moyenne: null, nb: 0, notes: {} }
        else target[tech] = { moyenne: cur, nb: r?.nb_notes ?? 0, notes: r?.notes ?? {} }
      }
    }

    // Note globale :
    // - Legacy (Med'Oc) : la globale figée avait le critère à 0 « cuit dedans » → on la recalcule
    //   comme moyenne des critères non nuls.
    // - Non-legacy : la globale stockée est calculée PAR évaluation (moyenne globale de chaque
    //   médecin, qui excluait déjà les 0) → déjà juste, on n'y touche PAS.
    const nonNull = MAJEURS.map((t) => target[t].moyenne).filter((v): v is number => v != null)
    const globaleCible = legacy
      ? nonNull.length
        ? round2(nonNull.reduce((a, b) => a + b, 0) / nonNull.length)
        : null
      : (moyRow?.moyenne_utilisateurs_base5 ?? null)

    plan.push({ sol, legacy, rowByTech, moyRow, target, globaleCible })

    // Affichage avant → après
    console.log(`\n### ${sol.nom} ${legacy ? '(legacy)' : '(non-legacy)'}`)
    let bouge = false
    for (const tech of MAJEURS) {
      const av = rowByTech[tech]?.moyenne_utilisateurs_base5 ?? null
      const ap = target[tech].moyenne
      const change = fmt(av) !== fmt(ap)
      if (change) bouge = true
      console.log(`  ${tech.padEnd(16)} ${fmt(av).padStart(6)} → ${fmt(ap).padStart(6)}${change ? '   ← change' : ''}`)
    }
    const avG = moyRow?.moyenne_utilisateurs_base5 ?? null
    const changeG = fmt(avG) !== fmt(globaleCible)
    if (changeG) bouge = true
    console.log(`  ${'NOTE GLOBALE'.padEnd(16)} ${fmt(avG).padStart(6)} → ${fmt(globaleCible).padStart(6)}${changeG ? '   ← change' : ''}`)
    if (!bouge) console.log('  (aucun changement)')
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN terminé. Relance avec --execute pour écrire.\n')
    return
  }

  // Backup AVANT écriture
  const dir = path.resolve(__dirname, '../backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(dir, `fix-notes-zero-nc-before-${stamp}.json`)
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      plan.map((p) => ({
        nom: p.sol.nom,
        legacy: p.legacy,
        criteres_avant: Object.fromEntries(MAJEURS.map((t) => [t, p.rowByTech[t] ?? null])),
        moyenne_avant: p.moyRow ?? null,
      })),
      null,
      2,
    ),
    'utf-8',
  )
  console.log(`\nBackup écrit : ${backupPath}`)

  // Écriture
  for (const p of plan) {
    for (const tech of MAJEURS) {
      const r = p.rowByTech[tech]
      if (!r) continue
      const t = p.target[tech]
      const patch: Any = {
        moyenne_utilisateurs_base5: t.moyenne,
        moyenne_utilisateurs: t.moyenne,
        nb_notes: t.nb,
        notes: t.notes,
      }
      if (p.legacy && t.moyenne == null) {
        patch.firebase_moyenne_base5 = null
        patch.firebase_nb_notes = 0
      }
      await supabase.from('resultats').update(patch).eq('id', r.id)
    }
    // Globale mise à jour uniquement pour le legacy (Med'Oc) ; non-legacy laissé intact.
    if (p.moyRow && p.legacy) {
      await supabase
        .from('resultats')
        .update({
          moyenne_utilisateurs_base5: p.globaleCible,
          moyenne_utilisateurs: p.globaleCible,
          firebase_moyenne_base5: p.globaleCible,
        })
        .eq('id', p.moyRow.id)
    }
    console.log(`✅ ${p.sol.nom}`)
  }

  console.log('\n=== Terminé. ===\n')
}

main().catch((e) => {
  console.error('\n❌ Erreur :', e)
  process.exit(1)
})
