/**
 * Annuaire mutualisé — catalogue de départ des compétences (2026-10-07).
 *
 * Insère dans `intitules` (type `competence`, statut `valide`) les intitulés de
 * `scripts/data/annuaire-catalogue-initial.json`, construit depuis le document
 * `annuaire-surspecialites.md` du dépôt messagerie avec les décisions de David
 * (cf. docs/2026-10-07-annuaire-tranche-1.md).
 *
 * Relançable : un intitulé déjà présent (même libellé, casse et espaces ignorés)
 * n'est ni réinséré ni modifié.
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de la table AVANT écriture.
 *
 * Usage : npx tsx scripts/annuaire-catalogue-initial.ts            # dry-run
 *         npx tsx scripts/annuaire-catalogue-initial.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type EntreeCatalogue = { libelle: string; synonymes: string[]; groupe: string; specialites_sm: string[] }

const cle = (libelle: string) => libelle.trim().toLowerCase()

async function main() {
  console.log(`\n=== Catalogue de départ de l'annuaire — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const catalogue: EntreeCatalogue[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'data/annuaire-catalogue-initial.json'), 'utf8'),
  )
  console.log(`Intitulés dans le fichier : ${catalogue.length}`)

  const { data: existants, error } = await supabase.from('intitules').select('*')
  if (error) throw error
  console.log(`Intitulés déjà en base : ${existants.length}`)

  const presents = new Set(existants.filter((i) => i.type === 'competence').map((i) => cle(i.libelle)))
  const aInserer = catalogue.filter((e) => !presents.has(cle(e.libelle)))
  console.log(`À insérer : ${aInserer.length} (déjà présents ignorés : ${catalogue.length - aInserer.length})`)
  console.log(`  dont masqués pour une spécialité RPPS : ${aInserer.filter((e) => e.specialites_sm.length).length}`)
  for (const e of aInserer.slice(0, 5)) console.log(`  ex. ${e.groupe} › ${e.libelle} [${e.synonymes.join(', ')}]`)

  if (!EXECUTE) {
    console.log('\nDry-run : rien n\'a été écrit. Relancer avec --execute pour insérer.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const backup = path.join(dossier, `annuaire-intitules-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backup, JSON.stringify(existants, null, 2))
  console.log(`\nBackup de la table avant écriture : ${backup}`)

  const maintenant = new Date().toISOString()
  const lignes: Database['public']['Tables']['intitules']['Insert'][] = aInserer.map((e) => ({
    type: 'competence',
    libelle: e.libelle,
    synonymes: e.synonymes,
    groupe: e.groupe,
    specialites_sm: e.specialites_sm,
    statut: 'valide',
    decide_le: maintenant,
  }))

  let inseres = 0
  for (let i = 0; i < lignes.length; i += 100) {
    const lot = lignes.slice(i, i + 100)
    const { error: errInsert } = await supabase.from('intitules').insert(lot)
    if (errInsert) throw errInsert
    inseres += lot.length
  }
  console.log(`Insérés : ${inseres}`)

  const { count } = await supabase.from('intitules').select('*', { count: 'exact', head: true })
  console.log(`Total en base après écriture : ${count}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
