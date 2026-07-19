/**
 * Fix « liens website sans protocole » (audit SEO 2026-07-19).
 *
 * Préfixe "https://" aux valeurs website / support_website qui n'ont pas de protocole
 * (ex. "www.weda.fr", "cgm.com/fr"). Sans ça, `<a href="www.weda.fr">` est un lien
 * RELATIF côté navigateur/Googlebot → 404 du type /solutions/<cat>/www.weda.fr.
 *
 * Complète le fix côté code (helper `ensureHttps` dans src/lib/url.ts, appliqué au rendu) :
 * ce script nettoie la donnée historique pour que les URLs stockées soient déjà propres.
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT.
 *
 * Usage : npx tsx scripts/fix-website-protocol.ts            # dry-run
 *         npx tsx scripts/fix-website-protocol.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

/** Même règle que le helper front src/lib/url.ts ensureHttps(). */
function needsFix(v: string | null): boolean {
  if (!v) return false
  const t = v.trim()
  return t !== '' && !/^(https?:\/\/|mailto:|tel:)/i.test(t)
}
function fixUrl(v: string): string {
  return `https://${v.trim()}`
}

const TARGETS = [
  { table: 'solutions', col: 'website' },
  { table: 'solutions', col: 'support_website' },
  { table: 'editeurs', col: 'website' },
] as const

async function main() {
  console.log(`\n=== Fix website sans protocole — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const plan: Any[] = []

  for (const { table, col } of TARGETS) {
    const { data, error } = await supabase.from(table).select(`id, nom, ${col}`)
    if (error) {
      console.error(`Erreur lecture ${table}.${col}: ${error.message}`)
      continue
    }
    for (const row of (data ?? []) as Any[]) {
      const val = row[col] as string | null
      if (needsFix(val)) {
        plan.push({ table, col, id: row.id, nom: row.nom, avant: val, apres: fixUrl(val as string) })
      }
    }
  }

  console.log(`\n${plan.length} valeur(s) à corriger :\n`)
  for (const p of plan) {
    console.log(`  [${p.table}.${p.col}] ${String(p.nom).padEnd(22)} ${p.avant}  →  ${p.apres}`)
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN terminé. Relance avec --execute pour écrire.\n')
    return
  }
  if (plan.length === 0) {
    console.log('\nRien à écrire.\n')
    return
  }

  // Backup AVANT écriture
  const dir = path.resolve(__dirname, '../backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(dir, `fix-website-protocol-before-${stamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(plan, null, 2), 'utf-8')
  console.log(`\nBackup écrit : ${backupPath}`)

  for (const p of plan) {
    const { error } = await supabase.from(p.table).update({ [p.col]: p.apres }).eq('id', p.id)
    if (error) console.error(`❌ ${p.table}.${p.col} ${p.nom}: ${error.message}`)
    else console.log(`✅ ${p.table}.${p.col} ${p.nom}`)
  }

  console.log('\n=== Terminé. ===\n')
}

main().catch((e) => {
  console.error('\n❌ Erreur :', e)
  process.exit(1)
})
