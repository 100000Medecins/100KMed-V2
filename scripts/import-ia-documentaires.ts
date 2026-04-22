/**
 * Script d'import des solutions "IA documentaires" depuis Excel
 * Usage : npx tsx scripts/import-ia-documentaires.ts [--dry-run]
 *
 * Fichier : comparatif_ia_documentaires_2026.xlsx (racine du projet)
 * Les en-têtes sont sur la ligne 2 (index 1).
 * Les lignes séparateurs de groupe sont détectées dynamiquement.
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

function uuid() { return crypto.randomUUID() }

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function normalizeKey(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function str(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
    // Supprime les caractères Private Use Area (drapeaux Excel, icônes, etc.)
    .replace(/[\uE000-\uF8FF]/g, '')
    .trim()
}

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

function parseTriState(val: unknown): 'oui' | 'partiel' | 'non' | null {
  const s = str(val).toLowerCase()
  if (!s) return null
  if (s.includes('✅') || (s.includes('oui') && !s.includes('non'))) return 'oui'
  if (s.includes('⚠️') || s.includes('partiel')) return 'partiel'
  if (s.includes('❌') || s.includes('non')) return 'non'
  return null
}

function isBoolOui(val: unknown): boolean {
  const s = str(val).toLowerCase()
  return s.includes('✅') || s === 'oui' || s === 'yes' || s === '1' || s === 'true'
}

/**
 * Extrait le texte entre parenthèses d'une chaîne.
 * "OpenAI (ChatGPT)" → "ChatGPT"
 */
function extractParens(s: string): string | null {
  const m = s.match(/\(([^)]+)\)/)
  return m ? m[1].trim() : null
}

/**
 * Parse "Nom éditeur (Ville, Date)" → { nom, ville, date }
 * "Doctolib (Paris, 2013)" → { nom: "Doctolib", ville: "Paris", date: "2013" }
 */
function parseEditeur(raw: string): { nom: string; ville: string | null; date: string | null } {
  const cleaned = raw.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ').trim()
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!parenMatch) {
    return { nom: cleaned.split('\n')[0].trim(), ville: null, date: null }
  }
  const nom = parenMatch[1].trim()
  const inner = parenMatch[2]
  const commaIdx = inner.lastIndexOf(',')
  if (commaIdx === -1) {
    return { nom, ville: inner.trim(), date: null }
  }
  const ville = inner.slice(0, commaIdx).trim()
  const date = inner.slice(commaIdx + 1).trim()
  return { nom, ville, date }
}

// ─── Lecture Excel ───────────────────────────────────────────────────────────

const xlsxPath = path.join(process.cwd(), 'comparatif_ia_documentaires_2026.xlsx')
const workbook = XLSX.readFile(xlsxPath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

// Les en-têtes sont sur la ligne 2 (index 1), forcé
const HEADER_ROW_INDEX = 1
const headerRow = rawRows[HEADER_ROW_INDEX] as unknown[]
const headers = headerRow.map((h) => str(h))

// Les données commencent à l'index 2
const dataRows = rawRows.slice(HEADER_ROW_INDEX + 1)

console.log(`✅ En-têtes ligne ${HEADER_ROW_INDEX + 1}. Colonnes (A→T) :`)
headers.slice(0, 20).forEach((h, i) => {
  const col = String.fromCharCode(65 + i)
  if (h) console.log(`  ${col}: ${h}`)
})
console.log()

// ─── Index de colonnes par position ────────────────────────────────────────
// B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, M=12, N=13, O=14, Q=16, R=17, S=18, T=19

const IDX_NOM         = 1   // B
const IDX_EDITEUR     = 2   // C
const IDX_TYPE        = 3   // D
const IDX_LANCEMENT   = 4   // E
const IDX_CORPUS      = 5   // F
const IDX_LLM         = 6   // G
const IDX_HDS         = 7   // H
const IDX_RGPD        = 8   // I
const IDX_AI_ACT      = 9   // J
const IDX_SERVEURS    = 10  // K
// L = 11 ignoré
const IDX_INTEGRATION = 12  // M
const IDX_TARIF       = 13  // N
const IDX_MODELE      = 14  // O (freemium/payant)
// P = 15 ignoré
const IDX_VALIDATION  = 16  // Q
const IDX_FORTS       = 17  // R
const IDX_FAIBLES     = 18  // S
const IDX_SITE        = 19  // T

// ─── Détection des lignes séparateurs de groupe ──────────────────────────────

type Groupe = 'francaises' | 'etrangeres' | 'generalistes'

function detectGroupe(raw: unknown[]): Groupe | null {
  // Une ligne séparateur a très peu de cellules non-vides (1-2) et col B contient le nom du groupe
  const nonEmpty = raw.filter((c) => str(c) !== '')
  if (nonEmpty.length > 3) return null
  const colB = normalizeKey(str(raw[IDX_NOM]))
  if (colB.includes('francais')) return 'francaises'
  if (colB.includes('etranger')) return 'etrangeres'
  if (colB.includes('generalist')) return 'generalistes'
  return null
}

function extractNom(raw: string, groupe: Groupe): string {
  if (groupe === 'generalistes') {
    // Prendre le texte entre parenthèses si présent, sinon 1ère ligne
    const parens = extractParens(raw)
    if (parens) return parens.split('\n')[0].trim()
  }
  return raw.split('\n')[0].trim()
}

// ─── Définition des tags ─────────────────────────────────────────────────────

type TagDef = { key: string; libelle: string; isSeparator?: boolean }

const TAG_DEFS: TagDef[] = [
  { key: 'sep_type',         libelle: 'Type',                           isSeparator: true },
  { key: 'type_specifique',  libelle: 'Spécifique' },
  { key: 'type_sante',       libelle: 'Généraliste avec offre santé' },
  { key: 'type_generaliste', libelle: 'Généraliste' },

  { key: 'sep_llm',          libelle: 'Moteur LLM',                     isSeparator: true },
  { key: 'llm_mistral',      libelle: 'Mistral AI' },
  { key: 'llm_proprietaire', libelle: 'Propriétaire' },
  { key: 'llm_non_precise',  libelle: 'Non précisé' },
  { key: 'llm_chatgpt',      libelle: 'ChatGPT' },
  { key: 'llm_claude',       libelle: 'Claude' },
  { key: 'llm_gemini',       libelle: 'Google Gemini' },

  { key: 'sep_conformite',   libelle: 'Conformité',                     isSeparator: true },
  { key: 'hds_oui',          libelle: 'HDS' },
  { key: 'hds_partiel',      libelle: 'HDS partiel' },
  { key: 'rgpd_oui',         libelle: 'RGPD' },
  { key: 'rgpd_partiel',     libelle: 'RGPD partiel' },
  { key: 'ai_act',           libelle: 'AI Act' },

  { key: 'sep_hebergement',  libelle: 'Hébergement',                    isSeparator: true },
  { key: 'serveurs_france',  libelle: 'Serveurs France' },
  { key: 'serveurs_ue',      libelle: 'Serveurs UE' },
  { key: 'serveurs_hors_ue', libelle: 'Serveurs Hors-UE' },

  { key: 'sep_integration',  libelle: 'Intégration',                    isSeparator: true },
  { key: 'integration_lgc',  libelle: 'Intégration LGC' },

  { key: 'sep_tarif',        libelle: 'Tarification',                   isSeparator: true },
  { key: 'freemium',         libelle: 'Freemium' },
  { key: 'payant',           libelle: 'Payant' },

  { key: 'sep_validation',   libelle: 'Validation',                     isSeparator: true },
  { key: 'validation_acad',  libelle: 'Validation académique' },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Catégorie (existante)
  const { data: categories } = await supabase.from('categories').select('id, nom, slug')
  const categorie = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '').includes('iadocumentaire') ||
           normalizeKey(c.nom ?? '').includes('documentaire')
  )
  if (!categorie) {
    console.error('❌ Catégorie "IA documentaires" introuvable dans Supabase. Créez-la d\'abord dans l\'admin.')
    process.exit(1)
  }
  console.log(`✅ Catégorie : "${categorie.nom}" (${categorie.id})\n`)
  const categorieId = categorie.id

  // 2. Tags
  console.log('📌 Vérification des tags...')
  const { data: existingTags } = await supabase
    .from('tags').select('id, libelle').eq('id_categorie', categorieId)

  const tagMap = new Map<string, string>()
  const dbTagMap = new Map<string, string>()
  for (const t of existingTags ?? []) {
    if (t.libelle) dbTagMap.set(normalizeKey(t.libelle), t.id)
  }

  for (let i = 0; i < TAG_DEFS.length; i++) {
    const def = TAG_DEFS[i]
    const norm = normalizeKey(def.libelle)
    if (dbTagMap.has(norm)) {
      tagMap.set(def.key, dbTagMap.get(norm)!)
    } else {
      log(`  Création tag "${def.libelle}"${def.isSeparator ? ' [séparateur]' : ''}`)
      if (!DRY_RUN) {
        const newId = uuid()
        const { error } = await supabase.from('tags').insert({
          id: newId,
          id_categorie: categorieId,
          libelle: def.libelle,
          ordre: i,
          is_separator: def.isSeparator ?? false,
        })
        if (error) { console.error(`❌ Tag "${def.libelle}":`, error.message); process.exit(1) }
        tagMap.set(def.key, newId)
        dbTagMap.set(norm, newId)
      } else {
        tagMap.set(def.key, `DRY-${def.key}`)
      }
    }
  }

  // 3. Solutions existantes
  const { data: existingSolutions } = await supabase
    .from('solutions').select('id, nom').eq('id_categorie', categorieId)

  const solutionMap = new Map<string, string>()
  for (const s of existingSolutions ?? []) {
    if (s.nom) solutionMap.set(normalizeKey(s.nom), s.id)
  }

  // 4. Éditeurs existants
  const { data: existingEditeurs } = await supabase.from('editeurs').select('id, nom')
  const editeurMap = new Map<string, string>()
  for (const e of existingEditeurs ?? []) {
    if (e.nom) editeurMap.set(normalizeKey(e.nom), e.id)
  }
  const editeursCrees: string[] = []

  // 5. Import ligne par ligne
  console.log('\n📥 Import des solutions...\n')
  let created = 0, updated = 0, skipped = 0
  let currentGroupe: Groupe = 'francaises'

  for (const rawRow of dataRows) {
    const row = rawRow as unknown[]

    // Détecter les lignes séparateurs de groupe
    const groupeDetecte = detectGroupe(row)
    if (groupeDetecte) {
      currentGroupe = groupeDetecte
      log(`\n── Groupe : ${groupeDetecte} ──`)
      continue
    }

    const nomRaw = str(row[IDX_NOM])
    if (!nomRaw) { skipped++; continue }

    const nom = extractNom(nomRaw, currentGroupe)
    if (!nom) { skipped++; continue }

    // ── Éditeur (colonne C) ──
    const editeurRaw = str(row[IDX_EDITEUR]).split('\n')[0].trim()
    let editeurId: string | null = null
    let dateFondation: string | null = null

    if (editeurRaw) {
      const parsed = parseEditeur(editeurRaw)
      dateFondation = parsed.date
      const normEdit = normalizeKey(parsed.nom)

      if (editeurMap.has(normEdit)) {
        editeurId = editeurMap.get(normEdit)!
      } else {
        log(`  Création éditeur "${parsed.nom}"${parsed.ville ? ` (${parsed.ville})` : ''}`)
        if (!DRY_RUN) {
          const { data, error } = await supabase
            .from('editeurs')
            .insert({ id: uuid(), nom: parsed.nom, contact_ville: parsed.ville ?? null })
            .select('id').single()
          if (error) { console.error(`❌ Éditeur "${parsed.nom}":`, error.message) }
          else {
            editeurId = data.id
            editeurMap.set(normEdit, editeurId!)
            editeursCrees.push(parsed.nom)
          }
        } else {
          editeurId = `DRY-EDIT-${parsed.nom}`
          editeurMap.set(normEdit, editeurId)
          editeursCrees.push(parsed.nom)
        }
      }
    }

    // ── Lecture des colonnes ──
    const typeRaw        = str(row[IDX_TYPE]).toLowerCase()
    const lancement      = str(row[IDX_LANCEMENT]).split('\n')[0].trim()
    const corpusRaw      = str(row[IDX_CORPUS])
    const llmRaw         = str(row[IDX_LLM])
    const hdsRaw         = str(row[IDX_HDS])
    const rgpdRaw        = str(row[IDX_RGPD])
    const aiActRaw       = str(row[IDX_AI_ACT])
    const serveursRaw    = str(row[IDX_SERVEURS]).toLowerCase()
    const integrationRaw = str(row[IDX_INTEGRATION]).toLowerCase()
    const tarifRaw       = str(row[IDX_TARIF])
    const modeleRaw      = str(row[IDX_MODELE]).toLowerCase()
    const validationRaw  = str(row[IDX_VALIDATION])
    const pointsForts    = str(row[IDX_FORTS])
    const pointsFaibles  = str(row[IDX_FAIBLES])
    const siteRaw        = str(row[IDX_SITE]).split('\n')[0].trim()

    // ── Tags à appliquer ──
    const tagsToApply: string[] = []

    // Type (colonne D)
    if (typeRaw.includes('offre sant')) {
      tagsToApply.push(tagMap.get('type_sante')!)
    } else if (typeRaw.includes('sp') && typeRaw.includes('cifique')) {
      tagsToApply.push(tagMap.get('type_specifique')!)
    } else if (typeRaw.includes('g') && typeRaw.includes('n') && typeRaw.includes('raliste')) {
      tagsToApply.push(tagMap.get('type_generaliste')!)
    }

    // Moteur LLM (colonne G) — multi-valeur
    const llmParts = llmRaw.split(/[,\n]/).map((p) => normalizeKey(p.trim())).filter(Boolean)
    for (const part of llmParts) {
      if (part.includes('mistral'))    tagsToApply.push(tagMap.get('llm_mistral')!)
      else if (part.includes('propri')) tagsToApply.push(tagMap.get('llm_proprietaire')!)
      else if (part.includes('nonprecis') || part.includes('nonpr')) tagsToApply.push(tagMap.get('llm_non_precise')!)
      else if (part.includes('chatgpt') || part.includes('gpt')) tagsToApply.push(tagMap.get('llm_chatgpt')!)
      else if (part.includes('claude')) tagsToApply.push(tagMap.get('llm_claude')!)
      else if (part.includes('gemini') || part.includes('google')) tagsToApply.push(tagMap.get('llm_gemini')!)
    }

    // HDS (colonne H)
    const hdsState = parseTriState(hdsRaw)
    if (hdsState === 'oui')     tagsToApply.push(tagMap.get('hds_oui')!)
    else if (hdsState === 'partiel') tagsToApply.push(tagMap.get('hds_partiel')!)

    // RGPD (colonne I)
    const rgpdState = parseTriState(rgpdRaw)
    if (rgpdState === 'oui')     tagsToApply.push(tagMap.get('rgpd_oui')!)
    else if (rgpdState === 'partiel') tagsToApply.push(tagMap.get('rgpd_partiel')!)

    // AI Act (colonne J) — créé mais non affiché
    if (isBoolOui(aiActRaw)) tagsToApply.push(tagMap.get('ai_act')!)

    // Serveurs (colonne K)
    if (serveursRaw.includes('france')) {
      tagsToApply.push(tagMap.get('serveurs_france')!)
      tagsToApply.push(tagMap.get('serveurs_ue')!)
    } else if (serveursRaw && !serveursRaw.includes('hors') && (serveursRaw.includes('ue') || serveursRaw.includes('eu') || serveursRaw.includes('europ'))) {
      tagsToApply.push(tagMap.get('serveurs_ue')!)
    } else if (serveursRaw.includes('hors') || serveursRaw.includes('usa') || serveursRaw.includes('us ')) {
      tagsToApply.push(tagMap.get('serveurs_hors_ue')!)
    }

    // Intégration LGC (colonne M)
    if (isBoolOui(integrationRaw) || integrationRaw.includes('oui')) {
      tagsToApply.push(tagMap.get('integration_lgc')!)
    }

    // Modèle tarifaire (colonne O)
    if (modeleRaw.includes('freemium')) tagsToApply.push(tagMap.get('freemium')!)
    if (modeleRaw.includes('payant'))   tagsToApply.push(tagMap.get('payant')!)

    // Validation académique (colonne Q)
    if (validationRaw) tagsToApply.push(tagMap.get('validation_acad')!)

    const uniqueTags = Array.from(new Set(tagsToApply.filter(Boolean)))

    // ── Payload solution ──
    const metaPayload: Record<string, unknown> = {}
    if (corpusRaw)      metaPayload['corpus_documentaire'] = corpusRaw
    if (tarifRaw)       metaPayload['tarif'] = tarifRaw
    if (validationRaw)  metaPayload['validation_academique'] = validationRaw

    const solutionPayload: Record<string, unknown> = {
      nom,
      slug: slugify(nom),
      id_categorie: categorieId,
      id_editeur: editeurId,
      lancement: lancement || null,
      website: siteRaw || null,
      date_fondation: dateFondation || null,
      evaluation_redac_points_forts:
        pointsForts ? pointsForts.split('\n').map((s) => s.trim()).filter(Boolean) : null,
      evaluation_redac_points_faibles:
        pointsFaibles ? pointsFaibles.split('\n').map((s) => s.trim()).filter(Boolean) : null,
      ...(Object.keys(metaPayload).length > 0 ? { meta: metaPayload } : {}),
    }

    // ── Créer ou mettre à jour ──
    const normNom = normalizeKey(nom)
    let solutionId: string

    if (solutionMap.has(normNom)) {
      solutionId = solutionMap.get(normNom)!
      log(`  [UPDATE] ${nom}`)
      if (!DRY_RUN) {
        await supabase.from('solutions').update(solutionPayload).eq('id', solutionId)
      }
      updated++
    } else {
      log(`  [CREATE] ${nom} (inactif)`)
      if (!DRY_RUN) {
        const { data, error } = await supabase
          .from('solutions')
          .insert({ id: uuid(), ...solutionPayload, actif: false })
          .select('id').single()
        if (error) { console.error(`❌ Erreur solution "${nom}":`, error.message); continue }
        solutionId = data.id
        solutionMap.set(normNom, solutionId)
      } else {
        solutionId = `DRY-SOL-${nom}`
        solutionMap.set(normNom, solutionId)
      }
      created++
    }

    // ── Tags ──
    if (DRY_RUN) {
      for (const tagId of uniqueTags) {
        const def = TAG_DEFS.find((d) => tagMap.get(d.key) === tagId)
        log(`    tag: ${def?.libelle ?? tagId}`)
      }
      continue
    }

    for (const tagId of uniqueTags) {
      const { data: existing } = await supabase
        .from('solutions_tags').select('id')
        .eq('id_solution', solutionId).eq('id_tag', tagId).maybeSingle()
      if (!existing) {
        const { error: tagError } = await supabase.from('solutions_tags').insert({
          id_solution: solutionId,
          id_tag: tagId,
          is_tag_principal: false,
        })
        if (tagError) console.error(`❌ Tag insert error (${tagId}):`, tagError.message)
      }
    }
  }

  // Résumé
  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Solutions créées       : ${created}`)
  console.log(`📝 Solutions mises à jour : ${updated}`)
  console.log(`⏭  Lignes ignorées        : ${skipped}`)
  if (editeursCrees.length > 0) {
    console.log(`🏢 Éditeurs créés         : ${editeursCrees.length}`)
    for (const e of editeursCrees) console.log(`   - ${e}`)
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Mode dry-run : aucune donnée écrite.')
    console.log('   Relancez sans --dry-run pour effectuer l\'import.')
  } else {
    console.log('\n✅ Import terminé. Les solutions sont inactives — activez-les dans l\'admin après vérification.')
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e)
  process.exit(1)
})
