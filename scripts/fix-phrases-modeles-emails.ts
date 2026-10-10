/**
 * Corrige des phrases fausses dans les modèles d'emails en base (`email_templates`).
 *
 * - 2026-10-10 `relance_psc` et `verification_psc` : « Ce lien est valable 7 jours ». Le lien de
 *   validation (`token_verification`) ne périme pas. La phrase de `relance_psc` ne cite pas le
 *   rythme des relances, pour rester vraie s'il change.
 * - 2026-10-10 `relance_1an` : « a 1 an » / « Il y a un an ». Le rappel part pour tout avis de
 *   plus d'un an jamais relancé ; 188 des 262 avis concernés dataient de 2023 ou 2024.
 *
 * Périmètre : uniquement les phrases listées ci-dessous. Une correction est ignorée si la phrase
 * d'origine n'est pas trouvée une seule fois (déjà corrigée, ou modèle modifié depuis l'admin).
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 *
 * Usage : npx tsx scripts/fix-phrases-modeles-emails.ts            # dry-run
 *         npx tsx scripts/fix-phrases-modeles-emails.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Champ = 'sujet' | 'contenu_html'
const CORRECTIONS: { id: string; champ: Champ; avant: string; apres: string }[] = [
  {
    id: 'relance_psc',
    champ: 'contenu_html',
    avant: 'Ce lien est valable 7 jours. Relance {{relance_num}}/{{max_relances}}.',
    apres: 'Nous vous enverrons au plus {{max_relances}} rappels à ce sujet. Celui-ci est le n° {{relance_num}}.',
  },
  {
    id: 'verification_psc',
    champ: 'contenu_html',
    avant: 'Ce lien est valable 7 jours.',
    apres: 'Vous pourrez aussi utiliser ce lien plus tard.',
  },
  {
    id: 'relance_1an',
    champ: 'sujet',
    avant: "Votre avis sur {{solution_nom}} a 1 an — toujours d'actualité ?",
    apres: "Votre avis sur {{solution_nom}} a plus d'un an — toujours d'actualité ?",
  },
  {
    id: 'relance_1an',
    champ: 'contenu_html',
    avant: 'Il y a un an, vous avez évalué',
    apres: "Il y a plus d'un an, vous avez évalué",
  },
]

async function main() {
  console.log(`\n=== Fix phrases des modèles d'emails — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const ids = [...new Set(CORRECTIONS.map((c) => c.id))]
  const { data: modeles, error } = await supabase.from('email_templates').select('*').in('id', ids)
  if (error) throw error

  let echec = false
  for (const id of ids) {
    const modele = modeles.find((m) => m.id === id)
    if (!modele) {
      console.log(`\n[${id}] modèle introuvable : ignoré.`)
      continue
    }

    const corrige: Pick<typeof modele, Champ> = { sujet: modele.sujet, contenu_html: modele.contenu_html }
    let modifie = false
    console.log(`\n[${id}]`)
    for (const c of CORRECTIONS.filter((x) => x.id === id)) {
      const occurrences = corrige[c.champ].split(c.avant).length - 1
      if (occurrences !== 1) {
        const deja = corrige[c.champ].includes(c.apres)
        console.log(`  ${c.champ} : ${deja ? 'déjà corrigé' : `phrase d'origine trouvée ${occurrences} fois (1 attendue), ignoré`}.`)
        continue
      }
      corrige[c.champ] = corrige[c.champ].replace(c.avant, c.apres)
      modifie = true
      console.log(`  ${c.champ} — avant : ${c.avant}`)
      console.log(`  ${c.champ} — après : ${c.apres}`)
    }

    if (!modifie || !EXECUTE) continue

    const backupDir = path.resolve(__dirname, '../backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const backupFile = path.join(backupDir, `modele-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(backupFile, JSON.stringify(modele, null, 2))
    console.log(`  Backup : ${backupFile}`)

    const { error: erreurEcriture } = await supabase
      .from('email_templates')
      .update({ ...corrige, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (erreurEcriture) throw erreurEcriture

    const { data: relu } = await supabase.from('email_templates').select('sujet, contenu_html').eq('id', id).single()
    const ok = !!relu && relu.sujet === corrige.sujet && relu.contenu_html === corrige.contenu_html
    console.log(ok ? '  Écrit et relu : conforme.' : '  ÉCHEC : le modèle relu ne correspond pas.')
    if (!ok) echec = true
  }

  if (!EXECUTE) console.log('\nDry-run : relancer avec --execute pour écrire.')
  if (echec) process.exitCode = 1
}

// Pas de `process.exit()` : sous Windows il fait échouer la fermeture de Node (assertion libuv).
main().catch((e) => { console.error(e); process.exitCode = 1 })
