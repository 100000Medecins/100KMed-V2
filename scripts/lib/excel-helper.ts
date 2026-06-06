/**
 * Helpers exceljs pour les scripts d'import/export.
 *
 * Pourquoi ce module : la migration xlsx → exceljs (2026-06-06) a changé l'API
 * mais l'usage dans les scripts reste simple (lire/écrire des tableaux et du JSON).
 * Ce module encapsule les conversions pour préserver la signature simple côté scripts.
 *
 * Cas non couverts ici :
 *   - Le styling (gras, couleurs, fusions de cellules). Pour ça, utiliser
 *     directement l'API exceljs (cf. scripts/export-catalogue-editeurs.ts).
 *   - La lecture multi-feuilles. Ajouter une variante si besoin.
 */

import * as ExcelJS from 'exceljs'

/**
 * Lit la première feuille d'un fichier .xlsx et renvoie un tableau de tableaux,
 * équivalent à `XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })`.
 *
 * Les lignes vides sont incluses (équivalent du comportement `xlsx` qui rend
 * toutes les rows entre la première et la dernière non-vide). Les cellules
 * vides sont normalisées à `''` pour faciliter le `String(cell)` côté appelants.
 *
 * @param path Chemin absolu vers le fichier .xlsx
 * @returns Tableau de lignes, chaque ligne étant un tableau de valeurs (par index 0)
 */
export async function readExcelAsRows(path: string): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error(`Aucune feuille trouvée dans ${path}`)

  const rows: unknown[][] = []
  // exceljs : rowCount inclut les lignes vides. eachRow saute les vides par défaut,
  // on force includeEmpty pour matcher le comportement xlsx.
  sheet.eachRow({ includeEmpty: true }, (row) => {
    // exceljs est 1-indexed : row.values[0] est toujours undefined.
    // On slice(1) pour rendre un tableau 0-indexed standard.
    const values = (row.values as unknown[]).slice(1)
    // Normaliser undefined/null en '' (équivalent defval: '' côté xlsx)
    rows.push(values.map((v) => (v === undefined || v === null ? '' : v)))
  })

  return rows
}

/**
 * Crée un nouveau workbook exceljs (wrapper trivial pour cohérence d'API).
 */
export function createWorkbook(): ExcelJS.Workbook {
  return new ExcelJS.Workbook()
}

/**
 * Ajoute une feuille remplie depuis un tableau d'objets JSON, équivalent
 * à `XLSX.utils.json_to_sheet(rows)`.
 *
 * Les en-têtes sont générées automatiquement depuis les clés du premier objet.
 * Si `rows` est vide, la feuille est créée vide (pas d'en-têtes).
 *
 * @param workbook Workbook cible (créé via `createWorkbook()`)
 * @param sheetName Nom de la feuille (visible dans Excel)
 * @param rows Tableau d'objets — toutes les clés du 1er objet deviennent des colonnes
 */
export function addSheetFromJson(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[]
): void {
  const sheet = workbook.addWorksheet(sheetName)
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  sheet.addRow(headers)

  for (const row of rows) {
    sheet.addRow(headers.map((h) => row[h] ?? ''))
  }
}

/**
 * Écrit le workbook sur disque, équivalent à `XLSX.writeFile(wb, path)`.
 * Wrapper async car exceljs est async.
 */
export async function writeWorkbook(workbook: ExcelJS.Workbook, path: string): Promise<void> {
  await workbook.xlsx.writeFile(path)
}
