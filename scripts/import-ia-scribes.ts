/**
 * Script d'import des solutions "IA Scribes" depuis Excel
 * Usage : npx tsx scripts/import-ia-scribes.ts [--dry-run]
 *
 * Fichier : comparatif_ia_scribes_2026.xlsx (racine du projet)
 * Les en-têtes sont sur la 3e ligne (les 2 premières sont ignorées).
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

function log(msg: string) {
  console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg)
}

/** Extrait le premier nombre d'une chaîne : "29€/mois" → 29 */
function extractNumber(val: unknown): number | null {
  const s = str(val).replace(/\s/g, '')
  const match = s.match(/(\d+([.,]\d+)?)/)
  if (!match) return null
  return parseFloat(match[1].replace(',', '.'))
}

/** Détecte oui / partiel / non depuis un texte avec emojis */
function parseTriState(val: unknown): 'oui' | 'partiel' | 'non' | null {
  const s = str(val).toLowerCase()
  if (!s) return null
  if (s.includes('✅') || (s.includes('oui') && !s.includes('non'))) return 'oui'
  if (s.includes('⚠️') || s.includes('partiel')) return 'partiel'
  if (s.includes('❌') || s.includes('non')) return 'non'
  return null
}

/** Nettoie le texte brut en supprimant le préfixe emoji/Oui/Non */
function cleanTriStateText(val: unknown): string {
  return str(val)
    .replace(/^[✅⚠️❌\s]+/u, '')
    .replace(/^(Oui|Non|Partiellement?)\s*[—–\-]\s*/i, '')
    .trim()
}

/** Détecte si un champ binaire est "oui" */
function isBoolOui(val: unknown): boolean {
  const s = str(val).toLowerCase()
  return s.includes('✅') || s === 'oui' || s === 'yes' || s === '1' || s === 'true'
}

// ─── Lecture Excel ───────────────────────────────────────────────────────────

const xlsxPath = path.join(process.cwd(), 'comparatif_ia_scribes_2026.xlsx')
const workbook = XLSX.readFile(xlsxPath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

// Trouver la ligne d'en-têtes : au moins 4 cellules non vides ET une cellule contenant "solution" ou "nom"
const HEADER_HINT = ['solution', 'nom']
const headerRowIndex = rawRows.findIndex((row) => {
  if (!Array.isArray(row)) return false
  const nonEmpty = row.filter((cell) => str(cell) !== '')
  if (nonEmpty.length < 4) return false  // les lignes titre ont peu de cellules
  return row.some((cell) => {
    const norm = normalizeKey(String(cell))
    return HEADER_HINT.some((h) => norm.includes(h))
  })
})

if (headerRowIndex === -1) {
  console.error('❌ Ligne d\'en-têtes introuvable (aucune cellule contenant "solution" ou "nom").')
  process.exit(1)
}

const headerRow = rawRows[headerRowIndex] as unknown[]
const headers = headerRow.map((h) => str(h))

const dataRows = rawRows.slice(headerRowIndex + 1)
const rows: Record<string, unknown>[] = dataRows
  .map((rawRow) => {
    const arr = rawRow as unknown[]
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { if (h) obj[h] = arr[i] ?? '' })
    return obj
  })
  .filter((r) => headers.some((h) => h && str(r[h]) !== ''))

if (rows.length === 0) {
  console.error('❌ Aucune ligne de données trouvée.')
  process.exit(1)
}

console.log(`✅ ${rows.length} lignes (en-têtes ligne ${headerRowIndex + 1}). Colonnes : ${headers.filter(Boolean).join(', ')}\n`)

// ─── Mapping colonnes ────────────────────────────────────────────────────────

const COL_NOM         = findCol(headers, 'Nom de la solution', 'Solution', 'Nom')
const COL_PAYS        = findCol(headers, 'Pays d\'origine', 'Pays', 'Origine', 'Pays origine')
const COL_FONDEE      = findCol(headers, 'Fondée', 'Fondee', 'Fondation', 'Année fondation', 'Date fondation')
const COL_AUDIO       = findCol(headers, 'Audio conservé', 'Audio conserve', 'Audio')
const COL_TRANSCRIT   = findCol(headers, 'Transcrit conservé', 'Transcrit conserve', 'Transcrit')
const COL_RESUME      = findCol(headers, 'Résumé réglable', 'Resume reglable', 'Résumé', 'Resume')
const COL_RGPD        = findCol(headers, 'RGPD')
const COL_HDS         = findCol(headers, 'HDS')
const COL_SOUVERAINETE = findCol(headers, 'Souveraineté serveurs', 'Souverainete serveurs', 'Souveraineté', 'Serveurs')
const COL_FREEMIUM    = findCol(headers, 'Freemium', 'Essai gratuit', 'Gratuit')
const COL_PRIX        = findCol(headers, 'Prix indicatif / mois', 'Prix indicatif', 'Prix / mois', 'Prix')
const COL_INTEGRATION = findCol(headers, 'Intégration logiciels France', 'Integration logiciels', 'Intégration', 'Integration')
const COL_POINTS_FORTS   = findCol(headers, 'Points forts', 'Points fort')
const COL_POINTS_FAIBLES = findCol(headers, 'Points faibles', 'Points faible')
const COL_SITE        = findCol(headers, 'Site web', 'Site internet', 'Site', 'Website', 'URL')

console.log('Mapping colonnes :')
console.log(`  Nom            : ${COL_NOM ?? '❌ NON TROUVÉ'}`)
console.log(`  Pays           : ${COL_PAYS ?? '❌ NON TROUVÉ'}`)
console.log(`  Fondée         : ${COL_FONDEE ?? '❌ NON TROUVÉ'}`)
console.log(`  Audio          : ${COL_AUDIO ?? '❌ NON TROUVÉ'}`)
console.log(`  Transcrit      : ${COL_TRANSCRIT ?? '❌ NON TROUVÉ'}`)
console.log(`  Résumé         : ${COL_RESUME ?? '❌ NON TROUVÉ'}`)
console.log(`  RGPD           : ${COL_RGPD ?? '❌ NON TROUVÉ'}`)
console.log(`  HDS            : ${COL_HDS ?? '❌ NON TROUVÉ'}`)
console.log(`  Souveraineté   : ${COL_SOUVERAINETE ?? '❌ NON TROUVÉ'}`)
console.log(`  Freemium       : ${COL_FREEMIUM ?? '❌ NON TROUVÉ'}`)
console.log(`  Prix           : ${COL_PRIX ?? '❌ NON TROUVÉ'}`)
console.log(`  Intégration    : ${COL_INTEGRATION ?? '❌ NON TROUVÉ'}`)
console.log(`  Points forts   : ${COL_POINTS_FORTS ?? '❌ NON TROUVÉ'}`)
console.log(`  Points faibles : ${COL_POINTS_FAIBLES ?? '❌ NON TROUVÉ'}`)
console.log(`  Site web       : ${COL_SITE ?? '❌ NON TROUVÉ'}\n`)

if (!COL_NOM) {
  console.error('❌ Colonne "Nom" introuvable. Vérifiez le fichier Excel.')
  process.exit(1)
}

// ─── Définition des tags ─────────────────────────────────────────────────────

type TagDef = { key: string; libelle: string; isSeparator?: boolean }

const TAG_DEFS: TagDef[] = [
  // Séparateurs
  { key: 'sep_audio',        libelle: 'Audio',           isSeparator: true },
  { key: 'audio_conserve',   libelle: 'Audio conservé' },

  { key: 'sep_transcrit',    libelle: 'Transcription',   isSeparator: true },
  { key: 'transcrit_oui',    libelle: 'Transcrit — Oui' },
  { key: 'transcrit_partiel',libelle: 'Transcrit — Partiellement' },
  { key: 'transcrit_non',    libelle: 'Transcrit — Non' },

  { key: 'sep_resume',       libelle: 'Compte rendu',    isSeparator: true },
  { key: 'resume_oui',       libelle: 'Résumé réglable — Oui' },
  { key: 'resume_partiel',   libelle: 'Résumé réglable — Partiellement' },
  { key: 'resume_non',       libelle: 'Résumé réglable — Non' },

  { key: 'sep_conformite',   libelle: 'Conformité',      isSeparator: true },
  { key: 'rgpd',             libelle: 'RGPD' },
  { key: 'hds',              libelle: 'HDS' },
  { key: 'ai_act',           libelle: 'AI Act' },

  { key: 'sep_hebergement',  libelle: 'Hébergement',     isSeparator: true },
  { key: 'serveurs_france',  libelle: 'Serveurs France' },
  { key: 'serveurs_ue',      libelle: 'Serveurs UE' },
  { key: 'serveurs_hors_ue', libelle: 'Serveurs Hors-UE' },

  { key: 'sep_tarif',        libelle: 'Tarification',    isSeparator: true },
  { key: 'essai_gratuit',    libelle: 'Essai gratuit' },

  { key: 'sep_lgc',          libelle: 'Intégration LGC', isSeparator: true },
  { key: 'lgc_extension',    libelle: 'Extension navigateur' },
  { key: 'lgc_multi',        libelle: 'Multi-LGC' },
  { key: 'lgc_independant',  libelle: 'Indépendant du LGC' },
  { key: 'lgc_proprietaire', libelle: 'Intégration LGC unique' },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Catégorie
  const { data: categories } = await supabase.from('categories').select('id, nom, slug')
  let categorie = (categories ?? []).find(
    (c) => normalizeKey(c.nom ?? '') === normalizeKey('IA Scribes') ||
           normalizeKey(c.nom ?? '') === normalizeKey('IA "Scribes"')
  )

  if (!categorie) {
    log('Création catégorie "IA \\"Scribes\\""')
    if (!DRY_RUN) {
      const { data, error } = await supabase
        .from('categories')
        .insert({ id: uuid(), nom: 'IA "Scribes"', slug: 'ia-scribes', actif: true })
        .select('id, nom, slug').single()
      if (error) { console.error('❌ Erreur catégorie:', error.message); process.exit(1) }
      categorie = data
    } else {
      categorie = { id: 'DRY-CAT', nom: 'IA "Scribes"', slug: 'ia-scribes' }
    }
    console.log(`  ✅ Catégorie créée : ${categorie!.id}`)
  } else {
    console.log(`  ✅ Catégorie existante : ${categorie.nom} (${categorie.id})`)
  }

  const categorieId = categorie!.id

  // 2. Tags
  console.log('\n📌 Vérification des tags...')
  const { data: existingTags } = await supabase
    .from('tags').select('id, libelle').eq('id_categorie', categorieId)

  const tagMap = new Map<string, string>() // key (TAG_DEFS) → id
  const dbTagMap = new Map<string, string>() // normalizeKey(libelle) → id
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

  // 4. Import ligne par ligne
  console.log('\n📥 Import des solutions...\n')
  let created = 0, updated = 0, skipped = 0

  for (const row of rows) {
    const nom = str(COL_NOM ? row[COL_NOM] : '').split('\n')[0].trim()
    if (!nom) { skipped++; continue }
    if (/^PARTIE\s+\d/i.test(nom) || /^[—–-]{2,}/.test(nom)) { skipped++; continue }

    const pays          = str(COL_PAYS ? row[COL_PAYS] : '')
    const fondee        = str(COL_FONDEE ? row[COL_FONDEE] : '')
    const audioRaw      = str(COL_AUDIO ? row[COL_AUDIO] : '')
    const transcritRaw  = str(COL_TRANSCRIT ? row[COL_TRANSCRIT] : '')
    const resumeRaw     = str(COL_RESUME ? row[COL_RESUME] : '')
    const rgpdRaw       = str(COL_RGPD ? row[COL_RGPD] : '')
    const hdsRaw        = str(COL_HDS ? row[COL_HDS] : '')
    const souveraineteRaw = str(COL_SOUVERAINETE ? row[COL_SOUVERAINETE] : '')
    const freemiumRaw   = str(COL_FREEMIUM ? row[COL_FREEMIUM] : '')
    const prixRaw       = str(COL_PRIX ? row[COL_PRIX] : '')
    const integrationRaw = str(COL_INTEGRATION ? row[COL_INTEGRATION] : '')
    const pointsForts   = str(COL_POINTS_FORTS ? row[COL_POINTS_FORTS] : '')
    const pointsFaibles = str(COL_POINTS_FAIBLES ? row[COL_POINTS_FAIBLES] : '')
    const site          = str(COL_SITE ? row[COL_SITE] : '')

    // ── Tags à appliquer ──
    const tagsToApply: string[] = []

    // Audio conservé
    if (isBoolOui(audioRaw)) tagsToApply.push(tagMap.get('audio_conserve')!)

    // Transcrit conservé
    const transcritState = parseTriState(transcritRaw)
    if (transcritState === 'oui')     tagsToApply.push(tagMap.get('transcrit_oui')!)
    else if (transcritState === 'partiel') tagsToApply.push(tagMap.get('transcrit_partiel')!)
    else if (transcritState === 'non')     tagsToApply.push(tagMap.get('transcrit_non')!)

    // Résumé réglable
    const resumeState = parseTriState(resumeRaw)
    if (resumeState === 'oui')     tagsToApply.push(tagMap.get('resume_oui')!)
    else if (resumeState === 'partiel') tagsToApply.push(tagMap.get('resume_partiel')!)
    else if (resumeState === 'non')     tagsToApply.push(tagMap.get('resume_non')!)

    // RGPD / HDS
    if (isBoolOui(rgpdRaw)) tagsToApply.push(tagMap.get('rgpd')!)
    if (isBoolOui(hdsRaw))  tagsToApply.push(tagMap.get('hds')!)

    // Souveraineté serveurs
    const souv = souveraineteRaw.toLowerCase()
    if (souv.includes('france')) {
      tagsToApply.push(tagMap.get('serveurs_france')!)
      tagsToApply.push(tagMap.get('serveurs_ue')!)   // France ⊂ UE
    } else if (souv && !souv.includes('hors') && (souv.includes('ue') || souv.includes('eu') || souv.includes('europ'))) {
      tagsToApply.push(tagMap.get('serveurs_ue')!)
    } else if (souv.includes('hors') || souv.includes('usa') || souv.includes('us ')) {
      tagsToApply.push(tagMap.get('serveurs_hors_ue')!)
    }

    // Essai gratuit
    if (isBoolOui(freemiumRaw)) tagsToApply.push(tagMap.get('essai_gratuit')!)

    // Intégration LGC
    const integ = integrationRaw.toLowerCase()
    if (integ.includes('extension') || integ.includes('navigateur') || integ.includes('chrome') || integ.includes('firefox')) {
      tagsToApply.push(tagMap.get('lgc_extension')!)
    }
    if (integ.includes('indépendant') || integ.includes('independant')) {
      tagsToApply.push(tagMap.get('lgc_independant')!)
    }
    if (/\d{2,}\+?\s*(dpi|lgc|logiciel|ehr|emr|intégr)/i.test(integrationRaw) ||
        integ.includes('multi') || integ.includes('plusieurs lgc') || integ.includes('compatible avec')) {
      tagsToApply.push(tagMap.get('lgc_multi')!)
    }
    // "Intégration LGC unique" : intègre nativement avec un seul LGC spécifique
    if (integ.includes('propriétaire') || integ.includes('proprietaire') ||
        integ.includes('natif') || integ.includes('uniquement') ||
        /\b(weda|maiia|medilink|hellodoc|axisanté|crossway|cpro)\b/i.test(integrationRaw)) {
      tagsToApply.push(tagMap.get('lgc_proprietaire')!)
    }

    // Dédoublonner les tags
    const uniqueTags = Array.from(new Set(tagsToApply.filter(Boolean)))

    // ── Payload solution ──
    const prix = extractNumber(prixRaw)

    const metaPayload = {
      ...(transcritRaw ? { transcrit_conserve: cleanTriStateText(transcritRaw) } : {}),
      ...(resumeRaw    ? { resume_reglable:    cleanTriStateText(resumeRaw) }    : {}),
      ...(integrationRaw ? { integration_lgc: integrationRaw }                  : {}),
    }

    const solutionPayload: Record<string, unknown> = {
      nom,
      slug: slugify(nom),
      id_categorie: categorieId,
      description: null,
      website: site || null,
      pays_origine: pays || null,
      date_fondation: fondee || null,
      prix_ttc: prix,
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
  console.log(`✅ Solutions créées   : ${created}`)
  console.log(`📝 Solutions mises à jour : ${updated}`)
  console.log(`⏭  Lignes ignorées   : ${skipped}`)

  if (DRY_RUN) {
    console.log('\n⚠️  Mode dry-run : aucune donnée écrite.')
    console.log('   Relancez sans --dry-run pour effectuer l\'import.')
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e)
  process.exit(1)
})
