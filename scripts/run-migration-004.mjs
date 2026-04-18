/**
 * Exécute la migration 004 via le CLI Supabase (si installé et linké au projet).
 * Sinon, affiche les instructions pour le faire manuellement.
 *
 * Usage : node scripts/run-migration-004.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { URL } from 'url'

const sqlPath = new URL('../supabase/migrations/004_newsletters_etudiant_questionnaires.sql', import.meta.url)
const sql = readFileSync(sqlPath, 'utf-8')

// Tenter l'exécution via Supabase CLI
let cliAvailable = false
try {
  execSync('supabase --version', { stdio: 'ignore' })
  cliAvailable = true
} catch {}

if (cliAvailable) {
  console.log('✅ Supabase CLI détecté — exécution de la migration...')
  try {
    execSync('supabase db push', { stdio: 'inherit' })
    console.log('✅ Migration 004 appliquée via supabase db push.')
  } catch (e) {
    console.error('❌ Erreur lors de supabase db push :', e.message)
    console.log('\n👉 Exécutez manuellement le SQL ci-dessous dans le dashboard Supabase.')
    printSql()
  }
} else {
  console.log('⚠️  Supabase CLI non disponible.\n')
  console.log('👉 Copiez-collez le SQL suivant dans le dashboard Supabase → SQL Editor :\n')
  console.log('   https://supabase.com/dashboard/project/_/sql\n')
  printSql()
}

function printSql() {
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
}
