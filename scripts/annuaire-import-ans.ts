/**
 * Annuaire mutualisé (tranche 2b) — import des médecins de l'Annuaire Santé dans Supabase.
 *
 * Source : la base SQLite que l'application construit déjà (dépôt messagerie, `lot8/annuaire.py`
 * → `lot8/donnees/annuaire.db`, extractions ANS « BAL MSSanté » + « RPPS personne-activité »,
 * géocodage BAN). Un seul calcul, deux usages : le téléphone télécharge cette base, le site en
 * importe les médecins. Cf. docs/2026-10-08-annuaire-tranche-2.md.
 *
 * Gardé : médecins seulement ; RPPS à 11 chiffres (le « 8 » de l'identifiant national retiré) ;
 * civilité, nom, prénom ; spécialité (libellé ANS + code SM du site) ; lieux d'exercice (adresse,
 * téléphones, position) ; adresses MSSanté personnelles. Les RPPS de `annuaire_oppositions` sont
 * exclus.
 *
 * Code SM : celui de l'extraction RPPS (`pro.savoir_faire_code`, depuis la base du 2026-10-09)
 * quand c'est une spécialité connue du site ; sinon rapprochement du libellé (bases plus
 * anciennes, médecins sans code, codes hors spécialités comme CEX22 en gynécologie).
 *
 * Écriture par « lot » (aucune requête longue : délai de 8 s par requête côté Supabase) :
 * insertion par paquets d'un nouveau lot → `annuaire_activer_lot` (bascule instantanée, refusée
 * sous 150 000 médecins) → `annuaire_purger_lots` (anciens lots effacés par paquets). Pas de
 * backup : les tables ne contiennent qu'une copie de données publiques, reconstructible.
 *
 * Usage : npx tsx scripts/annuaire-import-ans.ts                       # dry-run
 *         npx tsx scripts/annuaire-import-ans.ts --execute             # écrit
 *         npx tsx scripts/annuaire-import-ans.ts --base <annuaire.db>  # autre base
 */

import { createClient } from '@supabase/supabase-js'
import { DatabaseSync } from 'node:sqlite'
import * as dotenv from 'dotenv'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const iBase = process.argv.indexOf('--base')
const CHEMIN_BASE = iBase > -1
  ? process.argv[iBase + 1]
  : 'C:/Users/david/Documents/100000Medecins_messagerie/lot8/donnees/annuaire.db'
const PAQUET = 2000
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ── Spécialités : libellé ANS → code SM (nomenclature TRE_R38, ANS) ──────────────────────
const TRE_R38: Record<string, string> = {
  SM01: 'Anatomie et Cytologie pathologiques', SM02: 'Anesthésie-réanimation', SM03: 'Biologie médicale',
  SM04: 'Cardiologie et Maladies vasculaires', SM05: 'Chirurgie générale', SM06: 'Chirurgie maxillo-faciale',
  SM07: 'Chirurgie maxillo-faciale et Stomatologie', SM08: 'Chirurgie orthopédique et Traumatologie',
  SM09: 'Chirurgie infantile', SM10: 'Chirurgie plastique reconstructrice et esthétique',
  SM11: 'Chirurgie thoracique et cardio-vasculaire', SM12: 'Chirurgie urologique', SM13: 'Chirurgie vasculaire',
  SM14: 'Chirurgie viscérale et digestive', SM15: 'Dermatologie et Vénéréologie', SM16: 'Endocrinologie et Métabolisme',
  SM17: 'Génétique médicale', SM18: 'Gériatrie', SM19: 'Gynécologie médicale', SM20: 'Gynécologie-obstétrique',
  SM21: 'Hématologie', SM22: 'Hématologie, option Maladie du sang', SM23: 'Hématologie, option Onco-hématologie',
  SM24: 'Gastro-entérologie et Hépatologie', SM25: 'Médecine du travail', SM26: 'Qualifié en Médecine générale',
  SM27: 'Médecine interne', SM28: 'Médecine nucléaire', SM29: 'Médecine physique et de réadaptation',
  SM30: 'Néphrologie', SM31: 'Neuro-chirurgie', SM32: 'Neurologie', SM33: 'Neuro-psychiatrie',
  SM34: 'ORL et Chirurgie cervico-faciale', SM35: 'Oncologie, option Onco-hématologie', SM36: 'Oncologie, option médicale',
  SM37: 'Oncologie, option radiothérapie', SM38: 'Ophtalmologie', SM39: 'Oto-rhino-laryngologie', SM40: 'Pédiatrie',
  SM41: 'Pneumologie', SM42: 'Psychiatrie', SM43: 'Psychiatrie, option enfant et adolescent', SM44: 'Radio-diagnostic',
  SM45: 'Radio-thérapie', SM46: 'Médecine intensive-réanimation', SM47: 'Recherche médicale', SM48: 'Rhumatologie',
  SM49: 'Santé publique et Médecine sociale', SM50: 'Stomatologie',
  SM51: 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-obstétrique',
  SM52: 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-médicale', SM53: 'Spécialiste en Médecine générale',
  SM54: 'Médecine générale', SM55: 'Radio-diagnostic et Radio-thérapie', SM56: 'Chirurgie orale', SM57: 'Allergologie',
  SM58: 'Maladies infectieuses et tropicales', SM59: "Médecine d'urgence", SM60: 'Médecine légale et expertises médicales',
  SM61: 'Médecine vasculaire', SM62: 'Endocrinologie, diabétologie, nutrition',
  SM63: 'Biologie médicale option biologie générale',
  SM64: 'Biologie médicale option médecine moléculaire, génétique et pharmacologie',
  SM65: 'Biologie médicale option hématologie et immunologie', SM66: 'Biologie médicale option agents infectieux',
  SM67: 'Biologie médicale option biologie de la reproduction', SM68: 'Chirurgie maxillo-faciale (réforme 2017)',
  SM69: 'Chirurgie pédiatrique option chirurgie viscérale pédiatrique',
  SM70: 'Chirurgie pédiatrique option orthopédie pédiatrique', SM71: 'Hématologie (réforme 2017)',
  SM72: 'Médecine interne et immunologie clinique', SM73: 'Médecine cardiovasculaire', SM74: 'Radiologie imagerie médicale',
  SM75: 'Santé publique', SM76: 'Anesthésie-réanimation opt anesthésie-pédiatrique',
  SM77: 'Chirurgie maxillo-faciale opt orthod dysmo max-fac', SM78: 'Chirurgie viscérale et digestive opt endo chir',
  SM79: 'Méd cardiovasculaire opt card interventionnelle', SM80: "Méd cardiovasculaire opt imagerie cardio d'expert",
  SM81: 'Méd cardiovasculaire opt rythmo inter stimu card', SM82: 'Médecine intensive-réanimation opt réa pédiatrique',
  SM83: 'Néphrologie option soins intensifs néphrologiques', SM84: 'Neurologie opt trait interv ischémie céréb aigüe',
  SM85: 'Ophtalmologie opt chir ophtalmopéd strabologique', SM86: 'ORL - chir cervico-faciale opt audiophonologie',
  SM87: 'Pédiatrie option néonatologie', SM88: 'Pédiatrie option neuropédiatrie', SM89: 'Pédiatrie option pneumopédiatrie',
  SM90: 'Pédiatrie option réanimation pédiatrique', SM91: 'Pneumologie option soins intensifs respiratoires',
  SM92: 'Psychiatrie option enfant et adolescent', SM93: 'Psychiatrie option psychiatrie de la personne âgée',
  SM94: 'Radiologie et imagerie médicale opt radio inter av', SM95: 'Santé publique option administration de la santé',
}

// Libellés abrégés ou anciens présents dans l'extraction (relevés le 2026-10-08), absents de TRE_R38
const ABREGES: Record<string, string> = {
  'Spécialiste MG': 'SM53', 'Qualifié MG': 'SM26', 'Anesthésie-réanim': 'SM02',
  'O.R.L et chirurgie cervico faciale': 'SM34', 'Médecine physique et réadaptation': 'SM29',
  'Méd physiq & réadapt': 'SM29', 'Urologie': 'SM12', 'Obstétrique': 'SM20', 'Gynécologie-obsté': 'SM20',
  'Gynécologie médicale et obstétrique': 'SM20', 'Gyn. Méd. Obst.': 'SM20',
  'Gynéco-obstétrique et Gynéco médicale option Gynéco-obst': 'SM51',
  'Gynéco-obstétrique et Gynéco médicale option Gynéco-médicale': 'SM52',
  'Chir viscérale & dig': 'SM14', 'Chir orthop et traum': 'SM08', 'Cardio et malad vasc': 'SM04',
  'Gastro-entér. & hépa': 'SM24', 'Dermato. et vénéro.': 'SM15', 'Anatom & cyto patho': 'SM01',
  'Oncologie médicale': 'SM36',
}

function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' et ').replace(/[.,()'’\-/]/g, ' ').replace(/\s+/g, ' ').trim()
}

const CODE_PAR_LIBELLE = new Map<string, string>()
for (const [code, libelle] of Object.entries(TRE_R38)) CODE_PAR_LIBELLE.set(normaliser(libelle), code)
for (const [libelle, code] of Object.entries(ABREGES)) CODE_PAR_LIBELLE.set(normaliser(libelle), code)

function telephones(brut: string | null): string[] {
  if (!brut) return []
  return Array.from(new Set(brut.split(/[;,\s]+/).map((t) => t.trim()).filter((t) => /^\+?[0-9]{8,15}$/.test(t))))
}

type LigneMedecin = { lot: number; rpps: string; civilite: string | null; nom: string; prenom: string | null; specialite_libelle: string | null; specialite_code: string | null }
type LigneSite = { lot: number; id: number; nom: string | null; voie: string | null; code_postal: string | null; commune: string | null; telephones: string[]; lat: number | null; lon: number | null; origine: string | null }
type LigneExerce = { lot: number; rpps: string; site_id: number }
type LigneMssante = { lot: number; rpps: string; adresse: string }

async function inserer(table: 'ans_medecins' | 'ans_sites' | 'ans_exerce' | 'ans_mssante', lignes: object[]) {
  for (let i = 0; i < lignes.length; i += PAQUET) {
    const lot = lignes.slice(i, i + PAQUET)
    for (let essai = 1; ; essai++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).insert(lot as any)
      if (!error) break
      if (essai >= 3) throw new Error(`${table}, paquet ${i / PAQUET + 1} : ${error.message}`)
      await new Promise((r) => setTimeout(r, 1500 * essai))
    }
    process.stdout.write(`\r  ${table} : ${Math.min(i + PAQUET, lignes.length)} / ${lignes.length}`)
  }
  process.stdout.write('\n')
}

async function main() {
  console.log(`\n=== Import ANS → Supabase — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)
  console.log(`Base : ${CHEMIN_BASE}`)
  const db = new DatabaseSync(CHEMIN_BASE, { readOnly: true })
  const meta = Object.fromEntries((db.prepare('select cle, valeur from meta').all() as { cle: string; valeur: string }[]).map((r) => [r.cle, r.valeur]))
  const version = meta.version
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version ?? '')) throw new Error(`Version illisible dans meta : ${version}`)
  console.log(`Version de l'extraction ANS : ${version} (base construite le ${meta.construite})`)

  const { data: oppositions, error: errOpp } = await supabase.from('annuaire_oppositions').select('rpps')
  if (errOpp) throw errOpp
  const exclus = new Set((oppositions ?? []).map((o) => o.rpps))
  console.log(`Oppositions exclues : ${exclus.size}`)

  const lot = Math.floor(Date.now() / 1000)
  const idMedecin = (db.prepare("select id from libelle where texte = 'Médecin'").get() as { id: number }).id

  // Médecins (la colonne du code n'existe pas dans les bases d'avant le 2026-10-09)
  const avecColonneCode = (db.prepare('pragma table_info(pro)').all() as { name: string }[]).some((c) => c.name === 'savoir_faire_code')
  const pros = db.prepare(`select p.id, p.rpps, p.civilite, p.nom, p.prenom, l.texte as sf, ${avecColonneCode ? 'p.savoir_faire_code' : 'null'} as sf_code
    from pro p left join libelle l on l.id = p.savoir_faire_id where p.profession_id = ?`).all(idMedecin) as
    { id: number; rpps: string | null; civilite: string | null; nom: string | null; prenom: string | null; sf: string | null; sf_code: string | null }[]
  const rppsParPro = new Map<number, string>()
  const medecins: LigneMedecin[] = []
  const nonRapproches = new Map<string, number>()
  let rppsInvalides = 0
  let codesLus = 0
  for (const p of pros) {
    const id = p.rpps ?? ''
    const rpps = id.length === 12 && id.startsWith('8') ? id.slice(1) : id
    if (!/^[0-9]{11}$/.test(rpps) || !p.nom) { rppsInvalides++; continue }
    if (exclus.has(rpps)) continue
    const lu = p.sf_code?.trim()
    const codeLu = lu && lu in TRE_R38 ? lu : null
    if (codeLu) codesLus++
    const code = codeLu ?? (p.sf ? CODE_PAR_LIBELLE.get(normaliser(p.sf)) ?? null : null)
    if (p.sf && !code) nonRapproches.set(p.sf, (nonRapproches.get(p.sf) ?? 0) + 1)
    rppsParPro.set(p.id, rpps)
    medecins.push({ lot, rpps, civilite: p.civilite || null, nom: p.nom, prenom: p.prenom || null, specialite_libelle: p.sf, specialite_code: code })
  }

  // Lieux d'exercice des médecins gardés
  const exerceBrut = db.prepare(`select e.pro_id, e.site_id from exerce e join pro p on p.id = e.pro_id where p.profession_id = ?`).all(idMedecin) as { pro_id: number; site_id: number }[]
  const exerce: LigneExerce[] = []
  const vus = new Set<string>()
  const sitesUtiles = new Set<number>()
  for (const e of exerceBrut) {
    const rpps = rppsParPro.get(e.pro_id)
    if (!rpps) continue
    const cle = `${rpps}-${e.site_id}`
    if (vus.has(cle)) continue
    vus.add(cle)
    sitesUtiles.add(e.site_id)
    exerce.push({ lot, rpps, site_id: e.site_id })
  }
  const sitesBrut = db.prepare('select id, nom, voie, code_postal, commune, telephones, lat, lon, origine from site').all() as
    { id: number; nom: string | null; voie: string | null; code_postal: string | null; commune: string | null; telephones: string | null; lat: number | null; lon: number | null; origine: string | null }[]
  // L'ANS laisse des espaces doubles (« Paris 4e  Arrondissement ») : on les réduit
  const propre = (t: string | null) => t?.replace(/\s+/g, ' ').trim() || null
  const sites: LigneSite[] = sitesBrut.filter((s) => sitesUtiles.has(s.id)).map((s) => ({
    lot, id: s.id, nom: propre(s.nom), voie: propre(s.voie), code_postal: propre(s.code_postal), commune: propre(s.commune),
    telephones: telephones(s.telephones), lat: s.lat, lon: s.lon, origine: s.origine || null,
  }))

  // Adresses MSSanté personnelles
  const balBrut = db.prepare(`select b.adresse, b.pro_id from bal b join pro p on p.id = b.pro_id where p.profession_id = ?`).all(idMedecin) as { adresse: string; pro_id: number }[]
  const mssante: LigneMssante[] = []
  const vuesBal = new Set<string>()
  for (const b of balBrut) {
    const rpps = rppsParPro.get(b.pro_id)
    const adresse = (b.adresse ?? '').trim().toLowerCase()
    if (!rpps || !adresse.includes('@')) continue
    const cle = `${rpps}-${adresse}`
    if (vuesBal.has(cle)) continue
    vuesBal.add(cle)
    mssante.push({ lot, rpps, adresse })
  }

  const avecCode = medecins.filter((m) => m.specialite_code).length
  console.log(`\nMédecins : ${medecins.length} (RPPS invalides ou sans nom écartés : ${rppsInvalides})`)
  console.log(`  avec un code SM : ${avecCode} (lu dans l'extraction : ${codesLus}, déduit du libellé : ${avecCode - codesLus}) ; sans spécialité : ${medecins.filter((m) => !m.specialite_libelle).length}`)
  if (nonRapproches.size > 0) {
    console.log('  libellés non rapprochés :')
    for (const [libelle, n] of [...nonRapproches.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${n}\t${libelle}`)
  }
  console.log(`Lieux d'exercice : ${sites.length} (placés : ${sites.filter((s) => s.lat != null).length}) ; liens médecin-lieu : ${exerce.length}`)
  console.log(`Adresses MSSanté : ${mssante.length}`)
  console.log(`Exemple : ${JSON.stringify(medecins[0])}`)
  console.log(`Lot : ${lot}`)

  if (!EXECUTE) {
    console.log('\nDry-run : rien n\'a été écrit. Relancer avec --execute pour importer.')
    return
  }

  console.log('\nÉcriture du nouveau lot…')
  await inserer('ans_medecins', medecins)
  await inserer('ans_sites', sites)
  await inserer('ans_exerce', exerce)
  await inserer('ans_mssante', mssante)

  const { data: bilan, error: errActiver } = await supabase.rpc('annuaire_activer_lot', { p_lot: lot, p_version: version })
  if (errActiver) throw new Error(`Activation refusée : ${errActiver.message}`)
  console.log(`Lot activé : ${JSON.stringify(bilan)}`)

  let total = 0
  for (;;) {
    const { data: n, error } = await supabase.rpc('annuaire_purger_lots', { p_limite: 10000 })
    if (error) throw new Error(`Purge des anciens lots : ${error.message}`)
    total += n ?? 0
    if (!n) break
  }
  console.log(`Anciens lots effacés : ${total} ligne(s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
