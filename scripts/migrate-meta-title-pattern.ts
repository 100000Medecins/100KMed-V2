/**
 * Migre tous les meta.title existants vers le nouveau pattern
 * « Les avis de vos confrères sur <nom> - 100 000 Médecins ».
 *
 * - Ne touche QUE les solutions dont meta.title est déjà rempli (n'écrase rien
 *   pour les solutions qui n'ont jamais eu de SEO généré — celles-là tomberont
 *   sur le fallback du helper buildSolutionSeoTitle au runtime).
 * - meta.description, meta.canonical : intacts.
 * - Solutions en overflow (>60 chars avec ce pattern) : skip + listées en fin
 *   de run pour qu'on remplisse nom_seo manuellement.
 * - Backup JSON avant écriture (cf. règle CLAUDE.md sur les fix de données).
 *
 * Usage :
 *   npx tsx scripts/migrate-meta-title-pattern.ts           # dry-run par défaut
 *   npx tsx scripts/migrate-meta-title-pattern.ts --execute # écrit en BDD
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { URL } from 'url'
import { buildSolutionSeoTitle } from '../src/lib/seo/title'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

const EXECUTE = process.argv.includes('--execute')

interface Row {
  id: string
  nom: string
  nom_seo: string | null
  slug: string | null
  meta: Record<string, string | null> | null
}

async function main() {
  console.log(EXECUTE ? '🚀 Mode EXECUTE — écriture BDD' : '🔍 Mode dry-run (pas de sauvegarde, --execute pour écrire)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('solutions')
    .select('id, nom, nom_seo, slug, meta')

  if (error) {
    console.error('Erreur Supabase :', error)
    process.exit(1)
  }

  const all = (data ?? []) as Row[]
  const candidates = all.filter((s) => s.meta?.title)
  console.log(`\nTotal solutions : ${all.length}`)
  console.log(`Avec meta.title rempli : ${candidates.length}`)
  console.log(`Sans meta.title (laissées intactes, fallback runtime) : ${all.length - candidates.length}\n`)

  const updates: Array<{ id: string; nom: string; oldTitle: string; newTitle: string }> = []
  const overflows: Array<{ id: string; nom: string; slug: string | null; longueur: number }> = []
  const unchanged: Array<{ id: string; nom: string }> = []

  for (const sol of candidates) {
    const { title: newTitle, overflow } = buildSolutionSeoTitle({ nom: sol.nom, nom_seo: sol.nom_seo })
    if (overflow) {
      overflows.push({ id: sol.id, nom: sol.nom, slug: sol.slug, longueur: newTitle.length })
      continue
    }
    const oldTitle = sol.meta?.title ?? ''
    if (oldTitle === newTitle) {
      unchanged.push({ id: sol.id, nom: sol.nom })
      continue
    }
    updates.push({ id: sol.id, nom: sol.nom, oldTitle, newTitle })
  }

  console.log(`À mettre à jour  : ${updates.length}`)
  console.log(`Déjà au bon format : ${unchanged.length}`)
  console.log(`En overflow (skip) : ${overflows.length}\n`)

  for (const u of updates.slice(0, 20)) {
    console.log(`  ✏️  ${u.nom}`)
    console.log(`     avant : ${u.oldTitle}`)
    console.log(`     après : ${u.newTitle}`)
  }
  if (updates.length > 20) console.log(`  … (${updates.length - 20} autres)`)

  if (overflows.length > 0) {
    console.log(`\n⚠️  ${overflows.length} solution(s) en overflow — remplir nom_seo dans /admin/solutions/<id>/modifier :`)
    for (const o of overflows) {
      console.log(`   - ${o.nom} (${o.longueur} chars)  →  slug: ${o.slug ?? '?'}`)
    }
  }

  if (!EXECUTE) {
    console.log('\n💡 Relance avec --execute pour écrire (un backup JSON sera créé avant).')
    return
  }

  if (updates.length === 0) {
    console.log('\n✅ Rien à écrire.')
    return
  }

  // Backup avant écriture
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = new URL('../backups/', import.meta.url)
  try {
    mkdirSync(backupDir, { recursive: true })
  } catch {}
  const backupPath = new URL(`./meta-title-before-${stamp}.json`, backupDir)
  writeFileSync(
    backupPath,
    JSON.stringify(
      candidates.map((s) => ({ id: s.id, nom: s.nom, meta: s.meta })),
      null,
      2
    ),
    'utf-8'
  )
  console.log(`\n💾 Backup : ${backupPath.pathname}`)

  console.log(`\n🚀 Écriture en BDD (${updates.length} updates)…`)
  let ok = 0
  let ko = 0
  for (const u of updates) {
    const sol = candidates.find((c) => c.id === u.id)!
    const newMeta = { ...(sol.meta ?? {}), title: u.newTitle }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (supabase as any).from('solutions').update({ meta: newMeta }).eq('id', u.id)
    if (updErr) {
      console.error(`  ❌ ${u.nom} : ${updErr.message}`)
      ko++
    } else {
      ok++
    }
  }
  console.log(`\n✅ Terminé : ${ok} OK, ${ko} échec(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
