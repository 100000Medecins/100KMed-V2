/**
 * Annuaire mutualisé — retouches du catalogue des compétences, au fil des retours de David.
 *
 * La liste MODIFS ci-dessous décrit la dernière série (l'historique est dans git et le
 * CHANGELOG). Chaque retouche est aussi reportée dans `scripts/data/annuaire-catalogue-initial.json`
 * pour que le catalogue de départ reste cohérent avec la base.
 *
 * Relançable : une retouche déjà appliquée est signalée et ignorée.
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de la table AVANT écriture.
 *
 * Usage : npx tsx scripts/annuaire-catalogue-modifs.ts            # dry-run
 *         npx tsx scripts/annuaire-catalogue-modifs.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Modif =
  | { type: 'renommer'; de: string; vers: string; synonymes: string[] }
  | { type: 'ajouter'; libelle: string; synonymes: string[]; groupe: string }

// 2026-10-07 — retours de David après son premier essai
const MODIFS: Modif[] = [
  // « ECG et holter » séparé en trois : ECG, Holter ECG, MAPA (son ancien synonyme « mapa »)
  { type: 'renommer', de: 'ECG et holter', vers: 'ECG', synonymes: ['ecg', 'electrocardiogramme', 'electrocardiographie'] },
  { type: 'ajouter', libelle: 'Holter ECG', synonymes: ['holter', 'holter ecg', 'holter rythmique', 'enregistrement ecg 24h'], groupe: 'Médecine générale' },
  { type: 'ajouter', libelle: 'MAPA (holter tensionnel)', synonymes: ['mapa', 'holter tensionnel', 'mesure ambulatoire de la pression arterielle', 'hta'], groupe: 'Médecine générale' },
  // Médecin agréé de l'administration (fonction publique), distinct de l'agrément « permis de conduire » qui reste
  { type: 'ajouter', libelle: 'Médecin agréé', synonymes: ['medecin agree', 'agrement', 'fonction publique', 'comite medical', 'aptitude', 'conge longue maladie'], groupe: 'Pratiques transversales' },
]

const cle = (libelle: string) => libelle.trim().toLowerCase()

async function main() {
  console.log(`\n=== Retouches du catalogue — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const { data: tous, error } = await supabase.from('intitules').select('*').eq('type', 'competence')
  if (error) throw error
  const parCle = new Map(tous.map((i) => [cle(i.libelle), i]))

  const aFaire: Modif[] = []
  for (const m of MODIFS) {
    if (m.type === 'renommer') {
      const source = parCle.get(cle(m.de))
      if (!source) {
        console.log(parCle.has(cle(m.vers)) ? `  déjà fait : « ${m.de} » → « ${m.vers} »` : `  ⚠️ introuvable : « ${m.de} »`)
        continue
      }
      if (parCle.has(cle(m.vers))) {
        console.log(`  ⚠️ impossible : « ${m.vers} » existe déjà`)
        continue
      }
      const nbFiches = (await supabase.from('fiches_intitules').select('*', { count: 'exact', head: true }).eq('intitule_id', source.id)).count ?? 0
      console.log(`  renommer « ${m.de} » → « ${m.vers} » [${m.synonymes.join(', ')}] (cochée sur ${nbFiches} fiche(s), qui gardent la compétence renommée)`)
      aFaire.push(m)
    } else {
      if (parCle.has(cle(m.libelle))) {
        console.log(`  déjà fait : « ${m.libelle} » existe`)
        continue
      }
      console.log(`  ajouter « ${m.libelle} » (${m.groupe}) [${m.synonymes.join(', ')}]`)
      aFaire.push(m)
    }
  }

  if (aFaire.length === 0) {
    console.log('\nRien à faire.')
    return
  }
  if (!EXECUTE) {
    console.log(`\nDry-run : ${aFaire.length} retouche(s), rien n'a été écrit. Relancer avec --execute.`)
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const backup = path.join(dossier, `annuaire-intitules-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backup, JSON.stringify(tous, null, 2))
  console.log(`\nBackup de la table avant écriture : ${backup}`)

  const maintenant = new Date().toISOString()
  for (const m of aFaire) {
    if (m.type === 'renommer') {
      const source = parCle.get(cle(m.de))!
      const { error: e } = await supabase.from('intitules').update({ libelle: m.vers, synonymes: m.synonymes }).eq('id', source.id)
      if (e) throw e
      console.log(`  ✓ « ${m.de} » → « ${m.vers} »`)
    } else {
      const { error: e } = await supabase.from('intitules').insert({
        type: 'competence',
        libelle: m.libelle,
        synonymes: m.synonymes,
        groupe: m.groupe,
        statut: 'valide',
        decide_le: maintenant,
      })
      if (e) throw e
      console.log(`  ✓ « ${m.libelle} » ajouté`)
    }
  }

  const { count } = await supabase.from('intitules').select('*', { count: 'exact', head: true }).eq('statut', 'valide')
  console.log(`Compétences validées après écriture : ${count}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
