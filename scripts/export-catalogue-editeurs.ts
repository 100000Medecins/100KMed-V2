/**
 * Genere un export XLSX du catalogue editeurs x solutions avec coordonnees et prix.
 *
 * ⚠️  SCRIPT DESACTIVE depuis le 2026-06-06.
 * Lors de la migration xlsx → exceljs, ce script a ete laisse en l'etat car il
 * utilise `xlsx-js-style` pour le styling (gras, couleurs, fusions de cellules).
 * Migration plus delicate (API styling exceljs tres differente) et pas reutilise
 * en pratique. Voir TODO.md.
 *
 * Pour le reactiver :
 *   1. `npm install xlsx-js-style@^1.2.0` (vulnerabilite Prototype Pollution + ReDoS — script local seulement, non expose au front)
 *   2. Retirer ce throw + remettre l'import `xlsx-js-style`
 *   OU
 *   1. Migrer vers exceljs (API styling exceljs : sheet.getCell('A1').font = {...}, etc.)
 *
 * Mise en page d'origine :
 *   - Ligne 1 : categories de colonnes (Editeur / Solution / Tarification / Contacts commerciaux / Support)
 *     avec couleurs distinctes et cellules fusionnees.
 *   - Ligne 2 : titres de colonnes (gris fonce, texte blanc).
 *   - Lignes 3+ : donnees, alternance de lignes (zebrures) pour la lisibilite.
 *
 * Lecture seule (service_role). Aucune ecriture en BDD.
 * Sortie : exports/catalogue-editeurs-solutions-<date>.xlsx
 *
 * Usage : npx tsx scripts/export-catalogue-editeurs.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
// @ts-expect-error - xlsx-js-style desinstalle le 2026-06-06 (cf en-tete) ; les references XLSX.* restent figees dans le code pour faciliter une reactivation future
import * as XLSX from 'xlsx-js-style'

// Guard d'execution : echoue immediatement si le script est lance.
// (l'import ci-dessus echouera de toute facon car le package n'est plus installe,
//  ce throw donne juste un message clair plutot qu'une erreur "Cannot find module").
if (typeof process !== 'undefined' && process.argv[1]?.includes('export-catalogue-editeurs')) {
  throw new Error('Script desactive depuis le 2026-06-06 (migration xlsx-js-style → exceljs non faite). Voir l\'en-tete du fichier pour reactiver.')
}

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Editeur {
  id: string
  nom: string | null
  slug: string
  website: string | null
  contact_pays: string | null
}

interface Categorie {
  id: string
  nom: string | null
  slug: string | null
}

interface Solution {
  id: string
  nom: string
  slug: string | null
  actif: boolean | null
  id_editeur: string | null
  id_categorie: string | null
  prix_ttc: number | null
  prix_ttc_min: number | null
  prix_ttc_max: number | null
  prix_devise: string | null
  prix_frequence: string | null
  prix_duree_engagement_mois: number | null
  contact_email: string | null
  contact_telephone: string | null
  support_email: string | null
  support_telephone: string | null
  support_website: string | null
}

// ─── Definition des colonnes regroupees par categorie ─────────
// La couleur de la categorie est appliquee a la ligne 1 (header de groupe).
// La ligne 2 reprend le nom de la colonne avec un gris fonce.

interface ColumnDef {
  key: string
  label: string
  width: number
}

interface ColumnGroup {
  label: string
  color: string  // hex sans #
  columns: ColumnDef[]
}

const GROUPS: ColumnGroup[] = [
  {
    label: 'Editeur',
    color: '1E3A8A', // navy
    columns: [
      { key: 'editeur_nom',   label: 'Nom',  width: 24 },
      { key: 'editeur_slug',  label: 'Slug', width: 18 },
      { key: 'editeur_url',   label: 'Site web', width: 32 },
      { key: 'editeur_pays',  label: 'Pays', width: 10 },
    ],
  },
  {
    label: 'Solution',
    color: '0EA5E9', // accent-blue
    columns: [
      { key: 'solution_nom',        label: 'Nom',       width: 30 },
      { key: 'solution_slug',       label: 'Slug',      width: 22 },
      { key: 'solution_categorie',  label: 'Categorie', width: 22 },
      { key: 'solution_actif',      label: 'Actif',     width: 8 },
    ],
  },
  {
    label: 'Tarification (TTC)',
    color: 'F59E0B', // amber
    columns: [
      { key: 'solution_prix_ttc',         label: 'Prix unique',  width: 12 },
      { key: 'solution_prix_min',         label: 'Prix min',     width: 12 },
      { key: 'solution_prix_max',         label: 'Prix max',     width: 12 },
      { key: 'solution_devise',           label: 'Devise',       width: 8 },
      { key: 'solution_frequence',        label: 'Frequence',    width: 12 },
      { key: 'solution_engagement_mois',  label: 'Engagement (mois)', width: 14 },
    ],
  },
  {
    label: 'Contacts commerciaux',
    color: 'EC4899', // pink
    columns: [
      { key: 'solution_contact_email',     label: 'Email',     width: 28 },
      { key: 'solution_contact_telephone', label: 'Telephone', width: 16 },
    ],
  },
  {
    label: 'Support',
    color: '10B981', // green
    columns: [
      { key: 'solution_support_email',     label: 'Email',     width: 28 },
      { key: 'solution_support_telephone', label: 'Telephone', width: 16 },
      { key: 'solution_support_website',   label: 'Site',      width: 32 },
    ],
  },
]

const ALL_COLUMNS = GROUPS.flatMap((g) => g.columns)
type ColKey = string
type Row = Record<ColKey, string | number>

function buildRow(editeur: Editeur | null, solution: Solution | null, categorie: Categorie | null): Row {
  return {
    editeur_nom: editeur?.nom ?? '',
    editeur_slug: editeur?.slug ?? '',
    editeur_url: editeur?.website ?? '',
    editeur_pays: editeur?.contact_pays ?? '',
    solution_nom: solution?.nom ?? '',
    solution_slug: solution?.slug ?? '',
    solution_categorie: categorie?.nom ?? '',
    solution_actif: solution ? (solution.actif ? 'oui' : 'non') : '',
    solution_prix_ttc: solution?.prix_ttc ?? '',
    solution_prix_min: solution?.prix_ttc_min ?? '',
    solution_prix_max: solution?.prix_ttc_max ?? '',
    solution_devise: solution?.prix_devise ?? '',
    solution_frequence: solution?.prix_frequence ?? '',
    solution_engagement_mois: solution?.prix_duree_engagement_mois ?? '',
    solution_contact_email: solution?.contact_email ?? '',
    solution_contact_telephone: solution?.contact_telephone ?? '',
    solution_support_email: solution?.support_email ?? '',
    solution_support_telephone: solution?.support_telephone ?? '',
    solution_support_website: solution?.support_website ?? '',
  }
}

function lc(s: string | null | undefined): string {
  return (s ?? '').toLocaleLowerCase('fr-FR')
}

// ─── Style helpers ────────────────────────────────────────────

interface CellStyle {
  fill?: { fgColor: { rgb: string } }
  font?: { name?: string; sz?: number; bold?: boolean; color?: { rgb: string } }
  alignment?: { horizontal?: 'left' | 'center' | 'right'; vertical?: 'center'; wrapText?: boolean }
  border?: {
    top?: { style: string; color: { rgb: string } }
    bottom?: { style: string; color: { rgb: string } }
    left?: { style: string; color: { rgb: string } }
    right?: { style: string; color: { rgb: string } }
  }
}

function groupHeaderStyle(color: string): CellStyle {
  return {
    fill: { fgColor: { rgb: color } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FFFFFF' } },
      bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
      left: { style: 'thin', color: { rgb: 'FFFFFF' } },
      right: { style: 'thin', color: { rgb: 'FFFFFF' } },
    },
  }
}

const SUBHEADER_STYLE: CellStyle = {
  fill: { fgColor: { rgb: '374151' } }, // gray-700
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: {
    bottom: { style: 'medium', color: { rgb: '1F2937' } },
  },
}

function dataCellStyle(isZebra: boolean): CellStyle {
  return {
    fill: { fgColor: { rgb: isZebra ? 'F9FAFB' : 'FFFFFF' } },
    font: { sz: 10, color: { rgb: '1F2937' } },
    alignment: { vertical: 'center', wrapText: false },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  }
}

function colLetter(idx: number): string {
  // 0-based → A, B, C, ..., Z, AA, AB...
  let s = ''
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

async function main() {
  console.log('Lecture editeurs / solutions / categories…')

  const [editeursRes, solutionsRes, categoriesRes] = await Promise.all([
    supabase.from('editeurs').select('id, nom, slug, website, contact_pays'),
    supabase
      .from('solutions')
      .select(
        'id, nom, slug, actif, id_editeur, id_categorie, prix_ttc, prix_ttc_min, prix_ttc_max, prix_devise, prix_frequence, prix_duree_engagement_mois, contact_email, contact_telephone, support_email, support_telephone, support_website'
      ),
    supabase.from('categories').select('id, nom, slug'),
  ])

  if (editeursRes.error) throw editeursRes.error
  if (solutionsRes.error) throw solutionsRes.error
  if (categoriesRes.error) throw categoriesRes.error

  const editeurs = (editeursRes.data ?? []) as Editeur[]
  const solutions = (solutionsRes.data ?? []) as Solution[]
  const categories = (categoriesRes.data ?? []) as Categorie[]

  const catById = new Map(categories.map((c) => [c.id, c]))
  const editeurById = new Map(editeurs.map((e) => [e.id, e]))
  const editeursWithSolutions = new Set(solutions.map((s) => s.id_editeur).filter(Boolean))

  const solutionsSorted = [...solutions].sort((a, b) => {
    const ea = a.id_editeur ? editeurById.get(a.id_editeur)?.nom ?? '' : ''
    const eb = b.id_editeur ? editeurById.get(b.id_editeur)?.nom ?? '' : ''
    const c1 = lc(ea).localeCompare(lc(eb), 'fr')
    if (c1 !== 0) return c1
    return lc(a.nom).localeCompare(lc(b.nom), 'fr')
  })

  const rows: Row[] = []
  for (const s of solutionsSorted) {
    const editeur = s.id_editeur ? editeurById.get(s.id_editeur) ?? null : null
    const categorie = s.id_categorie ? catById.get(s.id_categorie) ?? null : null
    rows.push(buildRow(editeur, s, categorie))
  }
  const orphans = editeurs
    .filter((e) => !editeursWithSolutions.has(e.id))
    .sort((a, b) => lc(a.nom).localeCompare(lc(b.nom), 'fr'))
  for (const e of orphans) {
    rows.push(buildRow(e, null, null))
  }

  // ─── Construction de la feuille ─────────────────────────────
  const ws: XLSX.WorkSheet = {}

  // Ligne 1 : group headers (avec merges)
  let colIdx = 0
  const merges: XLSX.Range[] = []
  for (const group of GROUPS) {
    const startCol = colIdx
    const endCol = colIdx + group.columns.length - 1
    // On ecrit le label dans la 1re cellule du groupe
    const firstAddr = `${colLetter(startCol)}1`
    ws[firstAddr] = { t: 's', v: group.label, s: groupHeaderStyle(group.color) }
    // On styled les cellules suivantes du merge avec le meme style (sinon Excel
    // pourrait ne pas refleter la couleur sur toute la zone fusionnee).
    for (let c = startCol + 1; c <= endCol; c++) {
      ws[`${colLetter(c)}1`] = { t: 's', v: '', s: groupHeaderStyle(group.color) }
    }
    if (endCol > startCol) {
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } })
    }
    colIdx = endCol + 1
  }

  // Ligne 2 : titres de colonnes
  ALL_COLUMNS.forEach((col, i) => {
    ws[`${colLetter(i)}2`] = { t: 's', v: col.label, s: SUBHEADER_STYLE }
  })

  // Lignes 3+ : donnees avec zebrures
  rows.forEach((row, rIdx) => {
    const isZebra = rIdx % 2 === 1
    const style = dataCellStyle(isZebra)
    ALL_COLUMNS.forEach((col, i) => {
      const addr = `${colLetter(i)}${rIdx + 3}`
      const v = row[col.key]
      if (typeof v === 'number') {
        ws[addr] = { t: 'n', v, s: { ...style, alignment: { ...style.alignment, horizontal: 'right' } } }
      } else {
        ws[addr] = { t: 's', v: String(v ?? ''), s: style }
      }
    })
  })

  // Range total
  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: ALL_COLUMNS.length - 1, r: rows.length + 1 }, // +1 pour les 2 lignes header (0 et 1)
  })

  // Merges
  ws['!merges'] = merges

  // Largeurs de colonnes
  ws['!cols'] = ALL_COLUMNS.map((c) => ({ wch: c.width }))

  // Hauteurs de ligne (ligne 1 et 2 plus epaisses pour respirer)
  ws['!rows'] = [
    { hpt: 24 }, // ligne 1 : group headers
    { hpt: 28 }, // ligne 2 : column titles
  ]

  // Freeze les 2 lignes de header
  ws['!freeze'] = { xSplit: 0, ySplit: 2 }

  // AutoFilter sur la ligne 2 (titres) → tri/filtre dispo en un clic
  ws['!autofilter'] = {
    ref: `${colLetter(0)}2:${colLetter(ALL_COLUMNS.length - 1)}${rows.length + 2}`,
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue')

  // Sortie
  const exportsDir = path.resolve(__dirname, '../exports')
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true })
  // Timestamp YYYY-MM-DD_HHmm pour eviter le conflit si le fichier est deja ouvert
  // dans Excel (qui pose un verrou EBUSY).
  const now = new Date()
  const stamp =
    now.toISOString().slice(0, 10) +
    '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0')
  const filename = path.join(exportsDir, `catalogue-editeurs-solutions-${stamp}.xlsx`)
  XLSX.writeFile(wb, filename)

  // Stats
  const nbSolutionsAvecPrix = solutions.filter(
    (s) => s.prix_ttc != null || s.prix_ttc_min != null || s.prix_ttc_max != null
  ).length
  const nbSolutionsAvecContactCommercial = solutions.filter(
    (s) => s.contact_email || s.contact_telephone
  ).length
  const nbSolutionsAvecSupport = solutions.filter(
    (s) => s.support_email || s.support_telephone || s.support_website
  ).length
  const nbEditeursAvecSite = editeurs.filter((e) => e.website).length

  console.log('')
  console.log('Stats :')
  console.log(`  ${editeurs.length} editeurs (${nbEditeursAvecSite} avec URL, ${orphans.length} sans solution)`)
  console.log(`  ${solutions.length} solutions (${nbSolutionsAvecPrix} avec un prix renseigne)`)
  console.log(`  ${nbSolutionsAvecContactCommercial} solutions avec contact commercial`)
  console.log(`  ${nbSolutionsAvecSupport} solutions avec contact support`)
  console.log(`  ${rows.length} lignes au total dans le tableau`)
  console.log('')
  console.log(`OK fichier ecrit : ${filename}`)
}

main().catch((err) => {
  console.error('ERREUR :', err)
  process.exit(1)
})
