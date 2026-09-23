/**
 * Fix « vrai email saisi mais envois de masse vers psc-…@psc.sante.fr » (2026-09-24).
 *
 * Contexte : PSC production ne fournit pas l'email → le compte est créé avec l'adresse
 * fictive `psc-{rpps}@psc.sante.fr`. Quand le médecin saisit son vrai email sur
 * /completer-profil, `completeProfile` écrivait `users.contact_email` (+ l'email auth)
 * mais PAS `users.email`. Or tous les envois de masse (relances, newsletter, études,
 * questionnaires) lisent `users.email` → ces médecins ne recevaient rien et chaque envoi
 * partait vers une adresse inexistante. Le code est corrigé ; ce script rattrape l'existant.
 *
 * Périmètre : `users.email` fictif (psc-…@psc.sante.fr) ET `contact_email` réel
 * → `users.email = lower(trim(contact_email))`. Rien d'autre n'est touché.
 * Refus si l'adresse est déjà portée par un autre compte (fusion à traiter à la main).
 * L'email auth n'est pas modifié : le dry-run signale seulement les écarts.
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 *
 * Usage : npx tsx scripts/fix-users-email-psc.ts            # dry-run
 *         npx tsx scripts/fix-users-email-psc.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const estFictif = (email: string | null | undefined) => !!email && email.toLowerCase().endsWith('@psc.sante.fr')

async function main() {
  console.log(`\n=== Fix users.email fictif — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const users: { id: string; email: string | null; contact_email: string | null }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, contact_email')
      .range(from, from + PAGE - 1)
    if (error) throw error
    users.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  console.log(`Comptes lus : ${users.length}`)

  const emailsPris = new Map<string, string>()
  for (const u of users) if (u.email) emailsPris.set(u.email.toLowerCase(), u.id)

  const aCorriger: { id: string; avant: string; apres: string }[] = []
  const conflits: { id: string; email: string; autre: string }[] = []
  for (const u of users) {
    if (!estFictif(u.email) || !u.contact_email || estFictif(u.contact_email)) continue
    const apres = u.contact_email.trim().toLowerCase()
    const autre = emailsPris.get(apres)
    if (autre && autre !== u.id) conflits.push({ id: u.id, email: apres, autre })
    else aCorriger.push({ id: u.id, avant: u.email!, apres })
  }
  console.log(`À corriger : ${aCorriger.length}`)
  console.log(`Conflits (adresse déjà portée par un autre compte, non traités) : ${conflits.length}`)
  for (const c of conflits) console.log(`  - ${c.id} → ${c.email} (déjà sur ${c.autre})`)

  // Écarts avec l'email auth (information seulement)
  let authFictif = 0
  for (const u of aCorriger) {
    const { data } = await supabase.auth.admin.getUserById(u.id)
    if (estFictif(data.user?.email)) authFictif++
  }
  console.log(`Dont email auth encore fictif (non modifié par ce script) : ${authFictif}`)

  for (const u of aCorriger.slice(0, 5)) console.log(`  ex. ${u.avant} → ${u.apres}`)

  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const backupDir = path.resolve(__dirname, '../backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupFile = path.join(backupDir, `users-email-psc-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(aCorriger, null, 2))
  console.log(`\nBackup : ${backupFile}`)

  let ok = 0
  const erreurs: string[] = []
  for (const u of aCorriger) {
    const { error } = await supabase.from('users').update({ email: u.apres }).eq('id', u.id)
    if (error) erreurs.push(`${u.id}: ${error.message}`)
    else ok++
  }
  console.log(`Corrigés : ${ok} / ${aCorriger.length}, erreurs : ${erreurs.length}`)
  for (const e of erreurs) console.log(`  - ${e}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
