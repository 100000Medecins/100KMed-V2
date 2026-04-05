/**
 * Script d'import des agendas médicaux depuis Excel
 * Usage : npx tsx scripts/import-agendas.ts [--dry-run]
 *
 * Le fichier Excel doit être à la racine : agendas-medicaux-2026-v2.xlsx
 * Colonnes attendues (insensible à la casse) :
 *   - Nom / Solution
 *   - Editeur / Éditeur
 *   - Type (Plateforme annuaire | Solution cabinet | Outil territorial SNP)
 *   - Interface SAS / Interfacé SAS / SAS
 *   - Présentation / Description
 *   - Points forts
 *   - Points faibles
 *   - Site / Site internet / Website
 *   - Contact / Email
 *   - Téléphone / Tel
 */

import * as XLSX from 'xlsx'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers ────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID()
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function findCol(headers: string[], ...candidates: string[]): string | null {
  for (const c of candidates) {
    const norm = normalizeKey(c)
    const found = headers.find((h) => normalizeKey(h) === norm)
    if (found) return found
  }
  return null
}

function str(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function isSasOui(val: unknown): boolean {
  const s = str(val).toLowerCase()
  return s === 'oui' || s === 'yes' || s === '1' || s === 'true' || s === 'x'
}

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

// ─── Lecture Excel ───────────────────────────────────────────────────────────

const xlsxPath = path.join(process.cwd(), '2026 Listing agendas médicaux.xlsx')
const workbook = XLSX.readFile(xlsxPath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]

// Lire toutes les lignes comme tableaux bruts pour détecter la vraie ligne d'en-têtes
const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

// Trouver la première ligne qui contient "Solution" ou "Nom" (la vraie ligne d'en-têtes)
const HEADER_CANDIDATES = ['solution', 'nom', 'nomsolution']
const headerRowIndex = rawRows.findIndex((row) =>
  Array.isArray(row) && row.some((cell) => HEADER_CANDIDATES.includes(normalizeKey(String(cell))))
)

if (headerRowIndex === -1) {
  console.error('❌ Impossible de trouver la ligne d\'en-têtes (colonne "Nom" ou "Solution" introuvable).')
  process.exit(1)
}

// Construire les en-têtes depuis la ligne détectée (ignorer les cellules vides)
const headerRow = rawRows[headerRowIndex] as unknown[]
const headers: string[] = headerRow.map((h) => String(h ?? '').trim())

// Reconstruire les lignes de données avec ces en-têtes
const dataRows = rawRows.slice(headerRowIndex + 1)
const rows: Record<string, unknown>[] = dataRows.map((rawRow) => {
  const arr = rawRow as unknown[]
  const obj: Record<string, unknown> = {}
  headers.forEach((h, i) => {
    if (h) obj[h] = arr[i] ?? ''
  })
  return obj
}).filter((r) => headers.some((h) => h && String(r[h] ?? '').trim() !== ''))

if (rows.length === 0) {
  console.error('❌ Aucune ligne de données trouvée dans le fichier Excel.')
  process.exit(1)
}

console.log(`✅ ${rows.length} lignes trouvées (en-têtes ligne ${headerRowIndex + 1}). Colonnes : ${headers.filter(Boolean).join(', ')}\n`)

const COL_NOM = findCol(headers, 'Nom', 'Solution', 'Nom solution')
const COL_EDITEUR = findCol(headers, 'Editeur', 'Éditeur', 'Editeur logiciel')
const COL_TYPE = findCol(headers, 'Type')
const COL_SAS = findCol(headers, 'Interface SAS', 'Interfacé SAS', 'SAS', 'Interface SAS')
const COL_DESCRIPTION = findCol(headers, 'Présentation', 'Presentation', 'Description')
const COL_POINTS_FORTS = findCol(headers, 'Points forts', 'Points fort')
const COL_POINTS_FAIBLES = findCol(headers, 'Points faibles', 'Points faible')
const COL_SITE = findCol(headers, 'Site', 'Site internet', 'Site web', 'Website', 'URL', 'Lien', 'Web')
const COL_CONTACT = findCol(headers, 'Contact', 'Email', 'Mail')
const COL_TEL = findCol(headers, 'Téléphone', 'Telephone', 'Tel')

console.log('Mapping colonnes :')
console.log(`  Nom        : ${COL_NOM ?? '❌ NON TROUVÉ'}`)
console.log(`  Éditeur    : ${COL_EDITEUR ?? '❌ NON TROUVÉ'}`)
console.log(`  Type       : ${COL_TYPE ?? '❌ NON TROUVÉ'}`)
console.log(`  SAS        : ${COL_SAS ?? '❌ NON TROUVÉ'}`)
console.log(`  Description: ${COL_DESCRIPTION ?? '❌ NON TROUVÉ'}`)
console.log(`  Pts forts  : ${COL_POINTS_FORTS ?? '❌ NON TROUVÉ'}`)
console.log(`  Pts faibles: ${COL_POINTS_FAIBLES ?? '❌ NON TROUVÉ'}`)
console.log(`  Site       : ${COL_SITE ?? '❌ NON TROUVÉ'}`)
console.log(`  Contact    : ${COL_CONTACT ?? '❌ NON TROUVÉ'}`)
console.log(`  Téléphone  : ${COL_TEL ?? '❌ NON TROUVÉ'}\n`)

if (!COL_NOM) {
  console.error('❌ Colonne "Nom" introuvable. Vérifiez le fichier Excel.')
  process.exit(1)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Récupérer ou créer la catégorie "Agendas médicaux"
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nom, slug')
    .order('nom')

  let categorie = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '') === normalizeKey('Agendas médicaux')
      || normalizeKey(c.nom ?? '') === normalizeKey('Agendas medicaux')
  )

  if (!categorie) {
    log('Création catégorie "Agendas médicaux"')
    if (!DRY_RUN) {
      const { data, error } = await supabase
        .from('categories')
        .insert({ id: uuid(), nom: 'Agendas médicaux', slug: 'agendas-medicaux', actif: true })
        .select('id, nom, slug')
        .single()
      if (error) { console.error('❌ Erreur création catégorie:', error.message); process.exit(1) }
      categorie = data
    } else {
      categorie = { id: 'DRY-CATEGORIE', nom: 'Agendas médicaux', slug: 'agendas-medicaux' }
    }
    console.log(`  ✅ Catégorie créée : ${categorie!.id}`)
  } else {
    console.log(`  ✅ Catégorie existante : ${categorie.nom} (${categorie.id})`)
  }

  const categorieId = categorie!.id

  // 2. Récupérer les tags existants pour cette catégorie
  const { data: existingTags } = await supabase
    .from('tags')
    .select('id, libelle, is_separator, ordre')
    .eq('id_categorie', categorieId)
    .order('ordre', { ascending: true })

  const tagMap = new Map<string, string>() // normalizedLibelle -> id

  for (const t of existingTags ?? []) {
    if (t.libelle) tagMap.set(normalizeKey(t.libelle), t.id)
  }

  // Tags requis
  const TAGS_TYPES = [
    'Plateforme annuaire',
    'Solution cabinet',
    'Outil territorial SNP',
  ]
  const TAG_SAS = 'Interfacé SAS'

  async function ensureTag(libelle: string): Promise<string> {
    const norm = normalizeKey(libelle)
    if (tagMap.has(norm)) return tagMap.get(norm)!

    log(`  Création tag "${libelle}"`)
    if (!DRY_RUN) {
      const { data, error } = await supabase
        .from('tags')
        .insert({ id: uuid(), id_categorie: categorieId, libelle, ordre: tagMap.size })
        .select('id')
        .single()
      if (error) { console.error(`❌ Erreur création tag "${libelle}":`, error.message); process.exit(1) }
      tagMap.set(norm, data.id)
      return data.id
    } else {
      const fakeId = `DRY-TAG-${libelle}`
      tagMap.set(norm, fakeId)
      return fakeId
    }
  }

  // Créer les tags de type + SAS si manquants
  console.log('\n📌 Vérification des tags...')
  const tagIdType: Record<string, string> = {}
  for (const t of TAGS_TYPES) {
    tagIdType[normalizeKey(t)] = await ensureTag(t)
  }
  const tagIdSas = await ensureTag(TAG_SAS)

  // 3. Récupérer les éditeurs existants
  const { data: existingEditeurs } = await supabase
    .from('editeurs')
    .select('id, nom')

  const editeurMap = new Map<string, string>() // normalizedNom -> id
  for (const e of existingEditeurs ?? []) {
    if (e.nom) editeurMap.set(normalizeKey(e.nom), e.id)
  }

  // 4. Récupérer les solutions existantes (pour éviter les doublons)
  const { data: existingSolutions } = await supabase
    .from('solutions')
    .select('id, nom, slug')
    .eq('id_categorie', categorieId)

  const solutionMap = new Map<string, string>() // normalizedNom -> id
  for (const s of existingSolutions ?? []) {
    if (s.nom) solutionMap.set(normalizeKey(s.nom), s.id)
  }

  // 5. Traitement ligne par ligne
  console.log('\n📥 Import des solutions...\n')
  let created = 0
  let updated = 0
  let skipped = 0
  const editeursCrees: string[] = []

  for (const row of rows) {
    const nom = str(COL_NOM ? row[COL_NOM] : '')
    if (!nom) { skipped++; continue }
    // Ignorer les lignes de séparation (ex: "PARTIE 1 — ...")
    if (/^PARTIE\s+\d/i.test(nom) || /^[—–-]{2,}/.test(nom)) { skipped++; continue }

    const editeurNom = str(COL_EDITEUR ? row[COL_EDITEUR] : '')
    const type = str(COL_TYPE ? row[COL_TYPE] : '')
    const sasOui = isSasOui(COL_SAS ? row[COL_SAS] : '')
    const description = str(COL_DESCRIPTION ? row[COL_DESCRIPTION] : '')
    const pointsForts = str(COL_POINTS_FORTS ? row[COL_POINTS_FORTS] : '')
    const pointsFaibles = str(COL_POINTS_FAIBLES ? row[COL_POINTS_FAIBLES] : '')
    const site = str(COL_SITE ? row[COL_SITE] : '')
    const contactEmail = str(COL_CONTACT ? row[COL_CONTACT] : '')
    const contactTel = str(COL_TEL ? row[COL_TEL] : '')

    // Éditeur
    let editeurId: string | null = null
    if (editeurNom) {
      const normEdit = normalizeKey(editeurNom)
      if (editeurMap.has(normEdit)) {
        editeurId = editeurMap.get(normEdit)!
      } else {
        log(`  Création éditeur "${editeurNom}"`)
        if (!DRY_RUN) {
          const { data, error } = await supabase
            .from('editeurs')
            .insert({
              id: uuid(),
              nom: editeurNom,
              contact_email: contactEmail || null,
              contact_telephone: contactTel || null,
              website: site || null,
            })
            .select('id')
            .single()
          if (error) { console.error(`❌ Erreur éditeur "${editeurNom}":`, error.message); continue }
          editeurId = data.id
          editeurMap.set(normEdit, editeurId!)
          editeursCrees.push(editeurNom)
        } else {
          editeurId = `DRY-EDIT-${editeurNom}`
          editeurMap.set(normEdit, editeurId)
          editeursCrees.push(editeurNom)
        }
      }
    }

    // Tags à associer
    const tagsToAssociate: string[] = []
    const typeNorm = normalizeKey(type)
    if (tagIdType[typeNorm]) tagsToAssociate.push(tagIdType[typeNorm])
    if (sasOui) tagsToAssociate.push(tagIdSas)

    // Solution : créer ou mettre à jour
    const normNom = normalizeKey(nom)
    let solutionId: string

    const solutionPayload = {
      nom,
      slug: slugify(nom),
      id_categorie: categorieId,
      id_editeur: editeurId,
      description: description || null,
      website: site || null,
      evaluation_redac_points_forts: pointsForts
        ? pointsForts.split('\n').map((s) => s.trim()).filter(Boolean)
        : null,
      evaluation_redac_points_faibles: pointsFaibles
        ? pointsFaibles.split('\n').map((s) => s.trim()).filter(Boolean)
        : null,
    }

    if (solutionMap.has(normNom)) {
      solutionId = solutionMap.get(normNom)!
      log(`  [UPDATE] ${nom}`)
      if (!DRY_RUN) {
          await supabase.from('solutions').update({ ...solutionPayload, actif: false }).eq('id', solutionId)
      }
      updated++
    } else {
      log(`  [CREATE] ${nom} (inactif)`)
      if (!DRY_RUN) {
        const { data, error } = await supabase
          .from('solutions')
          .insert({ id: uuid(), ...solutionPayload, actif: false })
          .select('id')
          .single()
        if (error) { console.error(`❌ Erreur solution "${nom}":`, error.message); continue }
        solutionId = data.id
        solutionMap.set(normNom, solutionId)
      } else {
        solutionId = `DRY-SOL-${nom}`
        solutionMap.set(normNom, solutionId)
      }
      created++
    }

    // Association des tags
    for (const tagId of tagsToAssociate) {
      if (DRY_RUN) {
        log(`    tag: ${tagId}`)
        continue
      }
      const { data: existing } = await supabase
        .from('solutions_tags')
        .select('id')
        .eq('id_solution', solutionId)
        .eq('id_tag', tagId)
        .maybeSingle()

      if (!existing) {
        await supabase.from('solutions_tags').insert({
          id: uuid(),
          id_solution: solutionId,
          id_tag: tagId,
          enabled: true,
          is_principale: false,
        })
      }
    }
  }

  // Résumé
  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Solutions créées   : ${created}`)
  console.log(`📝 Solutions mises à jour : ${updated}`)
  console.log(`⏭  Lignes ignorées   : ${skipped}`)

  if (editeursCrees.length > 0) {
    console.log(`\n🏢 Éditeurs créés (à compléter dans l'admin) :`)
    for (const e of editeursCrees) {
      console.log(`   - ${e}`)
    }
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Mode dry-run : aucune donnée n\'a été écrite en base.')
    console.log('   Relancez sans --dry-run pour effectuer l\'import.')
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e)
  process.exit(1)
})
