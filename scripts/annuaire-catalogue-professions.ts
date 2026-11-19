/**
 * Annuaire — catalogue de départ des autres professions de santé (décision de David du 17/11/2026).
 *
 * Source : `scripts/data/annuaire-catalogue-professions.json` (rédigé par la session messagerie,
 * relu par David ; ses corrections se font dans ce fichier, puis on relance) :
 * - « nouveaux » : intitulés à créer (type `competence`, statut `valide`, `specialites_sm` vide,
 *   `professions` du fichier) ;
 * - « partages » : intitulés existants des médecins à ouvrir aussi à d'autres professions
 *   (`ajouter_professions`), parfois avec des synonymes en plus (`ajouter_synonymes`).
 *
 * Contrôle contre la base avant toute écriture (accents, casse et ponctuation ignorés comme la
 * recherche) : aucun libellé ni synonyme ne doit en doubler un autre ; un partage doit viser un
 * intitulé validé existant ; codes de profession connus. Une anomalie → rien n'est écrit.
 *
 * Relançable : ce qui est déjà en base est signalé et ignoré.
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de la table AVANT écriture,
 * relecture après écriture.
 *
 * Usage : npx tsx scripts/annuaire-catalogue-professions.ts            # dry-run
 *         npx tsx scripts/annuaire-catalogue-professions.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'
import { normaliserRecherche } from '../src/lib/annuaire/normaliser'
import { PROFESSIONS_SANTE } from '../src/lib/constants/annuaire'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Intitule = Database['public']['Tables']['intitules']['Row']
type Nouveau = { libelle: string; synonymes: string[]; groupe: string; professions: string[] }
type Partage = { libelle: string; ajouter_professions: string[]; ajouter_synonymes?: string[] }
type Fichier = { version: string; nouveaux: Nouveau[]; partages: Partage[] }

const cle = normaliserRecherche
const trier = (codes: string[]) => Array.from(new Set(codes)).sort()
const memes = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
const synonymesPropres = (s: string[]) => Array.from(new Set(s.map(cle).filter(Boolean)))

async function main() {
  console.log(`\n=== Catalogue des autres professions — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const fichier: Fichier = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'data/annuaire-catalogue-professions.json'), 'utf8'),
  )
  console.log(`Fichier version ${fichier.version} : ${fichier.nouveaux.length} nouveaux, ${fichier.partages.length} partages`)

  const { data: tous, error } = await supabase.from('intitules').select('*').eq('type', 'competence')
  if (error) throw error
  const valides = tous.filter((i) => i.statut === 'valide')
  console.log(`En base : ${tous.length} intitulés (${valides.length} validés, ${tous.length - valides.length} proposés)`)

  const anomalies: string[] = []

  // Codes de profession connus
  const codes = new Set([...fichier.nouveaux.flatMap((n) => n.professions), ...fichier.partages.flatMap((p) => p.ajouter_professions)])
  for (const c of codes) if (!(c in PROFESSIONS_SANTE)) anomalies.push(`code de profession inconnu : ${c}`)

  // Chaque forme (libellé ou synonyme, normalisée) → libellé de l'intitulé qui la porte (en base, ou
  // « nouveau » du fichier). Un doublon déjà présent entre deux intitulés de la base est seulement signalé.
  const porteur = new Map<string, string>()
  const doublonsBase: string[] = []
  const ajouterForme = (forme: string, qui: string, origine: string) => {
    const k = cle(forme)
    if (!k) return
    const deja = porteur.get(k)
    if (!deja || deja === qui) porteur.set(k, qui)
    else if (origine === 'base') doublonsBase.push(`« ${forme} » : « ${deja} » et « ${qui} »`)
    else anomalies.push(`« ${forme} » (${origine}) double une forme de « ${deja} »`)
  }
  for (const i of valides) {
    ajouterForme(i.libelle, i.libelle, 'base')
    for (const s of i.synonymes) ajouterForme(s, i.libelle, 'base')
  }
  if (doublonsBase.length > 0) {
    console.log(`Doublons déjà présents en base (non bloquants) : ${doublonsBase.length}`)
    for (const d of doublonsBase) console.log(`  ${d}`)
  }
  const parLibelle = new Map(valides.map((i) => [cle(i.libelle), i]))

  // Nouveaux : déjà en base (même libellé validé) → identique attendu ; sinon à créer
  const aCreer: Nouveau[] = []
  for (const n of fichier.nouveaux) {
    const existant = parLibelle.get(cle(n.libelle))
    if (existant) {
      const identique =
        memes(trier(existant.professions), trier(n.professions)) &&
        memes([...existant.synonymes].sort(), synonymesPropres(n.synonymes).sort()) &&
        existant.groupe === n.groupe
      if (identique) console.log(`  déjà fait : « ${n.libelle} »`)
      else anomalies.push(`« ${n.libelle} » existe déjà en base avec d'autres réglages (à fusionner à la main)`)
      continue
    }
    if (n.professions.length === 0) anomalies.push(`« ${n.libelle} » : aucune profession`)
    ajouterForme(n.libelle, n.libelle, 'nouveau')
    for (const s of n.synonymes) ajouterForme(s, n.libelle, `synonyme de « ${n.libelle} »`)
    aCreer.push(n)
  }

  // Partages : intitulé validé existant ; professions et synonymes manquants
  const aOuvrir: { intitule: Intitule; professions: string[]; synonymes: string[]; detail: string }[] = []
  for (const p of fichier.partages) {
    const i = parLibelle.get(cle(p.libelle))
    if (!i) {
      anomalies.push(`partage : « ${p.libelle} » introuvable parmi les compétences validées`)
      continue
    }
    const manquantes = p.ajouter_professions.filter((c) => !i.professions.includes(c))
    const nouveauxSyn = synonymesPropres(p.ajouter_synonymes ?? []).filter((s) => !i.synonymes.includes(s) && s !== cle(i.libelle))
    for (const s of nouveauxSyn) ajouterForme(s, i.libelle, `synonyme ajouté à « ${i.libelle} »`)
    if (manquantes.length === 0 && nouveauxSyn.length === 0) {
      console.log(`  déjà fait : partage de « ${i.libelle} »`)
      continue
    }
    aOuvrir.push({
      intitule: i,
      professions: trier([...i.professions, ...manquantes]),
      synonymes: [...i.synonymes, ...nouveauxSyn],
      detail:
        `+ ${manquantes.map((c) => PROFESSIONS_SANTE[c] ?? c).join(', ') || '(professions déjà là)'}` +
        (nouveauxSyn.length ? ` ; synonymes + ${nouveauxSyn.join(', ')}` : ''),
    })
  }

  console.log(`\nÀ créer : ${aCreer.length}`)
  const parProfession = new Map<string, number>()
  for (const n of aCreer) for (const c of n.professions) parProfession.set(c, (parProfession.get(c) ?? 0) + 1)
  for (const [c, nb] of [...parProfession.entries()].sort()) console.log(`  ${PROFESSIONS_SANTE[c] ?? c} : ${nb}`)
  for (const n of aCreer.slice(0, 3)) console.log(`  ex. ${n.groupe} › ${n.libelle} [${n.synonymes.join(', ')}] → ${n.professions.join(', ')}`)
  console.log(`À ouvrir à d'autres professions : ${aOuvrir.length}`)
  for (const o of aOuvrir) console.log(`  « ${o.intitule.libelle} » (${o.intitule.professions.join(', ')}) ${o.detail}`)

  if (anomalies.length > 0) {
    console.log(`\n⚠️ ${anomalies.length} anomalie(s), rien n'est écrit :`)
    for (const a of anomalies) console.log(`  - ${a}`)
    process.exit(1)
  }
  if (aCreer.length === 0 && aOuvrir.length === 0) {
    console.log('\nRien à faire.')
    return
  }
  if (!EXECUTE) {
    console.log("\nDry-run : aucune anomalie, rien n'a été écrit. Relancer avec --execute.")
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const backup = path.join(dossier, `annuaire-intitules-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backup, JSON.stringify(tous, null, 2))
  console.log(`\nBackup de la table avant écriture : ${backup}`)

  const maintenant = new Date().toISOString()
  const lignes: Database['public']['Tables']['intitules']['Insert'][] = aCreer.map((n) => ({
    type: 'competence',
    libelle: n.libelle,
    synonymes: synonymesPropres(n.synonymes),
    groupe: n.groupe,
    specialites_sm: [],
    professions: trier(n.professions),
    statut: 'valide',
    decide_le: maintenant,
  }))
  for (let i = 0; i < lignes.length; i += 100) {
    const { error: e } = await supabase.from('intitules').insert(lignes.slice(i, i + 100))
    if (e) throw e
  }
  console.log(`  ✓ ${lignes.length} intitulé(s) créé(s)`)
  for (const o of aOuvrir) {
    const { error: e } = await supabase
      .from('intitules')
      .update({ professions: o.professions, synonymes: o.synonymes })
      .eq('id', o.intitule.id)
    if (e) throw e
  }
  console.log(`  ✓ ${aOuvrir.length} intitulé(s) ouvert(s) à d'autres professions`)

  // Relecture
  const { data: apres, error: errApres } = await supabase.from('intitules').select('*').eq('type', 'competence').eq('statut', 'valide')
  if (errApres) throw errApres
  const apresParLibelle = new Map(apres.map((i) => [cle(i.libelle), i]))
  const ecarts = [
    ...aCreer.filter((n) => !memes(apresParLibelle.get(cle(n.libelle))?.professions ?? [], trier(n.professions))).map((n) => n.libelle),
    ...aOuvrir.filter((o) => !memes(apresParLibelle.get(cle(o.intitule.libelle))?.professions ?? [], o.professions)).map((o) => o.intitule.libelle),
  ]
  console.log(`Compétences validées après écriture : ${apres.length} (avant : ${valides.length})`)
  console.log(ecarts.length === 0 ? 'Relecture : conforme.' : `⚠️ Relecture : écarts sur ${ecarts.join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
