/**
 * Ajoute la question « médecin junior équipé d'une carte e-CPF » dans deux
 * questionnaires, PUIS les lignes `criteres` jumelles (pour la moyenne du sous-critère).
 *
 * DEUX tables sont concernées (cf. échange avec David) :
 *   - questionnaire_questions : pilote l'AFFICHAGE du formulaire d'évaluation.
 *   - criteres                : pilote le CALCUL des moyennes agrégées (resultats)
 *                               + l'affichage « Comparatif détaillé par sous-critères ».
 *   L'admin ne remplit que la 1re → sans la 2de, la question compte dans son critère
 *   majeur + la note globale, mais n'a pas de moyenne de sous-critère isolée.
 *
 * INSERT pur (aucun DDL). Idempotent (skip si la clé existe déjà). Backup JSON avant écriture.
 *
 * Usage :
 *   npx tsx scripts/add-question-ecpf-junior.ts            # dry-run (n'écrit rien)
 *   npx tsx scripts/add-question-ecpf-junior.ts --execute  # écrit en base
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CritereMajeur = 'interface' | 'fonctionnalites' | 'editeur' | 'qualite_prix' | 'fiabilite'

// ── 1) Questions du formulaire (table questionnaire_questions) ─────────────────

interface QuestionInsertion {
  categorieSlug: string
  sectionTitre: string
  key: string
  critereMajeur: CritereMajeur
  question: string
}

const QUESTIONS: QuestionInsertion[] = [
  {
    categorieSlug: 'teletransmission',
    sectionTitre: 'Mobilité, matériel & relation éditeur',
    key: 'tt_ecpf_remplacant',
    critereMajeur: 'fonctionnalites',
    question:
      'La facturation par un remplaçant ou un interne avec sa propre carte e-CPF (Carte de Professionnel en Formation) est-elle bien gérée : lecture de la carte, mode remplaçant, télétransmission FSE et paramétrage sans friction ?',
  },
  {
    categorieSlug: 'logiciel-medical',
    sectionTitre: 'Et si cela vous concerne…',
    key: 'detail_ecpf_junior',
    critereMajeur: 'interface',
    question:
      'Pour un remplaçant / interne équipé d\'une carte e-CPF (Carte de Professionnel en Formation), de facturer et télétransmettre avec sa propre carte ?',
  },
]

// ── 2) Sous-critères de scoring (table criteres) ──────────────────────────────
// parent_id + id_categorie sont RECOPIÉS depuis un sous-critère frère existant
// (même critère majeur parent), pour garantir un placement identique aux autres.

interface CritereInsertion {
  identifiantTech: string
  siblingIdentifiantTech: string // sous-critère existant partageant le même parent/catégorie
  nomCourt: string
}

const CRITERES: CritereInsertion[] = [
  { identifiantTech: 'tt_ecpf_remplacant', siblingIdentifiantTech: 'tt_delegation_secretariat', nomCourt: 'e-CPF remplaçant' },
  { identifiantTech: 'detail_ecpf_junior', siblingIdentifiantTech: 'detail_droits_acces', nomCourt: 'e-CPF interne/remplaçant' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

interface SectionRow { id: string; categorie_slug: string; titre: string; ordre: number }
interface QuestionRow { id: string; section_id: string; key: string; question: string; critere_majeur: string; ordre: number }
interface CritereRow { id: string; identifiant_tech: string; id_categorie: string; parent_id: string | null; type: string; nom_court: string | null }

async function resolveSection(categorieSlug: string, titre: string): Promise<SectionRow | null> {
  const { data, error } = await supabase
    .from('questionnaire_sections')
    .select('id, categorie_slug, titre, ordre')
    .eq('categorie_slug', categorieSlug)
    .eq('titre', titre)
  if (error) throw new Error(`Lecture sections (${categorieSlug}) : ${error.message}`)
  if (!data || data.length === 0) return null
  if (data.length > 1) throw new Error(`Section ambiguë (${data.length} lignes) pour « ${titre} » (${categorieSlug})`)
  return data[0] as SectionRow
}

async function questionsOfSection(sectionId: string): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from('questionnaire_questions')
    .select('id, section_id, key, question, critere_majeur, ordre')
    .eq('section_id', sectionId)
    .order('ordre', { ascending: true })
  if (error) throw new Error(`Lecture questions (section ${sectionId}) : ${error.message}`)
  return (data ?? []) as QuestionRow[]
}

async function questionKeyExists(key: string): Promise<boolean> {
  const { data, error } = await supabase.from('questionnaire_questions').select('id').eq('key', key).limit(1)
  if (error) throw new Error(`Vérif clé question « ${key} » : ${error.message}`)
  return (data ?? []).length > 0
}

async function getCritere(identifiantTech: string): Promise<CritereRow | null> {
  const { data, error } = await supabase
    .from('criteres')
    .select('id, identifiant_tech, id_categorie, parent_id, type, nom_court')
    .eq('identifiant_tech', identifiantTech)
    .limit(1)
  if (error) throw new Error(`Lecture critere « ${identifiantTech} » : ${error.message}`)
  return (data && data.length ? data[0] : null) as CritereRow | null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== e-CPF junior — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===\n`)

  const backup: Record<string, unknown> = { genere_le: new Date().toISOString() }

  // ── PHASE 1 : questionnaire_questions ──
  console.log('── Phase 1 : questionnaire_questions (formulaire) ──\n')
  const qPlan: { ins: QuestionInsertion; section: SectionRow; ordre: number; skip: boolean }[] = []
  const qBackupSections: Record<string, { section: SectionRow; questionsAvant: QuestionRow[] }> = {}

  for (const ins of QUESTIONS) {
    const section = await resolveSection(ins.categorieSlug, ins.sectionTitre)
    if (!section) throw new Error(`Section introuvable : « ${ins.sectionTitre} » (${ins.categorieSlug}).`)
    const existing = await questionsOfSection(section.id)
    qBackupSections[section.id] = { section, questionsAvant: existing }
    const exists = await questionKeyExists(ins.key)
    const ordre = existing.length ? Math.max(...existing.map((q) => q.ordre)) + 1 : 0
    qPlan.push({ ins, section, ordre, skip: exists })
    console.log(`• ${ins.categorieSlug} → « ${section.titre} »  clé=${ins.key}  critère=${ins.critereMajeur}  ordre=${ordre}${exists ? '  ⚠️ SKIP (déjà présente)' : ''}`)
  }
  qBackupSections && (backup.phase1_sections = qBackupSections)
  const qToInsert = qPlan.filter((p) => !p.skip)
  console.log(`\n→ ${qToInsert.length} question(s) à insérer, ${qPlan.length - qToInsert.length} déjà présente(s).\n`)

  // ── PHASE 2 : criteres ──
  console.log('── Phase 2 : criteres (scoring / moyennes de sous-critères) ──\n')
  const cPlan: { ins: CritereInsertion; sibling: CritereRow; skip: boolean }[] = []
  for (const ins of CRITERES) {
    const already = await getCritere(ins.identifiantTech)
    const sibling = await getCritere(ins.siblingIdentifiantTech)
    if (!sibling) throw new Error(`Sous-critère frère introuvable dans criteres : « ${ins.siblingIdentifiantTech} ».`)
    cPlan.push({ ins, sibling, skip: !!already })
    console.log(`• ${ins.identifiantTech}  (nom_court « ${ins.nomCourt} »)`)
    console.log(`    frère        : ${ins.siblingIdentifiantTech}`)
    console.log(`    id_categorie : ${sibling.id_categorie}`)
    console.log(`    parent_id    : ${sibling.parent_id}`)
    console.log(`    type=detail, is_parent=false, is_enfant=true${already ? '   ⚠️ SKIP (déjà présent dans criteres)' : ''}\n`)
  }
  const cToInsert = cPlan.filter((p) => !p.skip)
  console.log(`→ ${cToInsert.length} sous-critère(s) à insérer, ${cPlan.length - cToInsert.length} déjà présent(s).\n`)

  if (!EXECUTE) {
    console.log('DRY-RUN terminé. Relance avec --execute pour écrire.\n')
    return
  }

  if (qToInsert.length === 0 && cToInsert.length === 0) {
    console.log('Rien à insérer (tout est déjà présent). Aucune écriture.\n')
    return
  }

  // ── Backup avant écriture ──
  const backupsDir = path.resolve(__dirname, '../backups')
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupsDir, `questionnaire-ecpf-before-${stamp}.json`)
  backup.phase2_criteres_a_inserer = cToInsert.map((p) => ({
    identifiant_tech: p.ins.identifiantTech,
    id_categorie: p.sibling.id_categorie,
    parent_id: p.sibling.parent_id,
    nom_court: p.ins.nomCourt,
  }))
  backup.rollback = [
    qToInsert.length ? `DELETE FROM questionnaire_questions WHERE key IN (${qToInsert.map((p) => `'${p.ins.key}'`).join(', ')});` : null,
    cToInsert.length ? `DELETE FROM criteres WHERE identifiant_tech IN (${cToInsert.map((p) => `'${p.ins.identifiantTech}'`).join(', ')});` : null,
  ].filter(Boolean)
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')
  console.log(`Backup écrit : ${backupPath}\n`)

  // ── Inserts phase 1 ──
  for (const p of qToInsert) {
    const { data, error } = await supabase
      .from('questionnaire_questions')
      .insert({ section_id: p.section.id, key: p.ins.key, question: p.ins.question, critere_majeur: p.ins.critereMajeur, ordre: p.ordre })
      .select('id, key, ordre')
      .single()
    if (error) { console.error(`❌ question « ${p.ins.key} » : ${error.message}`); throw error }
    console.log(`✅ question insérée : ${data.key} (id ${data.id}, ordre ${data.ordre})`)
  }

  // ── Inserts phase 2 ──
  for (const p of cToInsert) {
    const { data, error } = await supabase
      .from('criteres')
      .insert({
        id: randomUUID(),
        identifiant_tech: p.ins.identifiantTech,
        id_categorie: p.sibling.id_categorie,
        parent_id: p.sibling.parent_id,
        type: 'detail',
        is_parent: false,
        is_enfant: true,
        nom_court: p.ins.nomCourt,
      })
      .select('id, identifiant_tech')
      .single()
    if (error) { console.error(`❌ critere « ${p.ins.identifiantTech} » : ${error.message}`); throw error }
    console.log(`✅ sous-critère inséré : ${data.identifiant_tech} (id ${data.id})`)
  }

  console.log(`\n=== Terminé. ===`)
  console.log(`Rollback : ${(backup.rollback as string[]).join('  ')}\n`)
}

main().catch((e) => {
  console.error('\n❌ Erreur :', e.message)
  process.exit(1)
})
