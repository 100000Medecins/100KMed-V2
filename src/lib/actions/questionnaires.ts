'use server'

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export type QuestionnaireQuestion = {
  id: string
  section_id: string
  key: string
  question: string
  critere_majeur: 'interface' | 'fonctionnalites' | 'editeur' | 'qualite_prix' | 'fiabilite'
  ordre: number
  /** Libellé court affiché dans le « Comparatif détaillé par sous-critères ». Miroir du `criteres.nom_court` jumeau. */
  nom_court: string | null
}

export type QuestionnaireSection = {
  id: string
  categorie_slug: string
  titre: string
  introduction: string | null
  ordre: number
  questions: QuestionnaireQuestion[]
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getSectionsForSlug(categorieSlug: string): Promise<QuestionnaireSection[]> {
  if (!categorieSlug) return []

  const supabase: DB = createServiceRoleClient()

  const { data: sections } = await supabase
    .from('questionnaire_sections')
    .select('id, categorie_slug, titre, introduction, ordre')
    .eq('categorie_slug', categorieSlug)
    .order('ordre', { ascending: true })

  // Pas de questionnaire pour cette catégorie → tableau vide. Plus de fallback
  // silencieux sur 'default' : une catégorie sans questionnaire doit afficher
  // un message dédié côté front, pas un questionnaire inadapté.
  if (!sections || sections.length === 0) return []

  const sectionIds = sections.map((s: QuestionnaireSection) => s.id)

  const { data: questions } = await supabase
    .from('questionnaire_questions')
    .select('id, section_id, key, question, critere_majeur, ordre, nom_court')
    .in('section_id', sectionIds)
    .order('ordre', { ascending: true })

  return sections.map((s: QuestionnaireSection) => ({
    ...s,
    questions: (questions ?? []).filter((q: QuestionnaireQuestion) => q.section_id === s.id),
  }))
}

export async function getAllSlugs(): Promise<string[]> {
  const supabase: DB = createServiceRoleClient()
  const { data } = await supabase
    .from('questionnaire_sections')
    .select('categorie_slug')
  const slugs = Array.from(new Set((data ?? []).map((r: { categorie_slug: string }) => r.categorie_slug)))
  return slugs as string[]
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function createSection(categorieSlug: string, titre: string, introduction: string | null, ordre: number) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { data, error } = await supabase
    .from('questionnaire_sections')
    .insert({ categorie_slug: categorieSlug, titre, introduction, ordre })
    .select('id, categorie_slug, titre, introduction, ordre')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
  return { section: { ...data, questions: [] } }
}

export async function updateSection(id: string, titre: string, introduction: string | null) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase
    .from('questionnaire_sections')
    .update({ titre, introduction })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
}

export async function deleteSection(id: string) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()

  // Pas de FK cascade sur `questionnaire_questions.section_id` → on supprime explicitement
  // les questions de la section ET leurs jumeaux `criteres` (sinon orphelins des deux côtés).
  const { data: questions } = await supabase
    .from('questionnaire_questions')
    .select('key')
    .eq('section_id', id)
  const keys = (questions ?? []).map((q: { key: string }) => q.key).filter(Boolean)
  if (keys.length > 0) {
    await supabase.from('criteres').delete().eq('is_enfant', true).in('identifiant_tech', keys)
    await supabase.from('questionnaire_questions').delete().eq('section_id', id)
  }

  const { error } = await supabase
    .from('questionnaire_sections')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
}

export async function reorderSections(orderedIds: string[]) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('questionnaire_sections').update({ ordre: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/questionnaires')
}

// ── Questions ─────────────────────────────────────────────────────────────────

// Deux tables décrivent une question : `questionnaire_questions` (formulaire) et sa ligne
// jumelle `criteres` (`is_enfant=true`) qui pilote la moyenne de sous-critère + le
// « Comparatif détaillé par sous-critères ». Le lien est mou : `questionnaire_questions.key`
// = `criteres.identifiant_tech`. Les helpers ci-dessous maintiennent le jumeau en phase pour
// garder l'invariant « 0 orphelin » sans intervention manuelle.

type CritereTwin = { id_categorie: string; parent_id: string; type: string | null }

/**
 * Résout les colonnes structurantes du jumeau `criteres` d'une question :
 * - `id_categorie` = `categories.id` du slug de la section (comme les enfants de cette catégorie),
 * - `parent_id`    = id du critère majeur canonique (`type='note'`, unique par `identifiant_tech`),
 * - `type`         = convention de la catégorie, copiée d'un enfant existant (logiciel-medical='detail',
 *                    autres catégories=NULL), sinon NULL par défaut.
 * Retourne `{ error }` si le majeur ou la catégorie est introuvable (on n'écrit alors rien).
 */
async function resolveCritereTwin(
  supabase: DB,
  sectionId: string,
  critereMajeur: QuestionnaireQuestion['critere_majeur']
): Promise<CritereTwin | { error: string }> {
  const { data: section } = await supabase
    .from('questionnaire_sections')
    .select('categorie_slug')
    .eq('id', sectionId)
    .single()
  if (!section?.categorie_slug) return { error: 'Section introuvable' }

  const { data: categorie } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', section.categorie_slug)
    .single()
  if (!categorie?.id) return { error: `Catégorie introuvable (${section.categorie_slug})` }

  const { data: majeur } = await supabase
    .from('criteres')
    .select('id')
    .eq('type', 'note')
    .eq('identifiant_tech', critereMajeur)
    .single()
  if (!majeur?.id) return { error: `Critère majeur introuvable (${critereMajeur})` }

  const { data: frere } = await supabase
    .from('criteres')
    .select('type')
    .eq('is_enfant', true)
    .eq('id_categorie', categorie.id)
    .limit(1)
    .maybeSingle()

  return { id_categorie: categorie.id, parent_id: majeur.id, type: frere?.type ?? null }
}

/** Construit la ligne `criteres` jumelle à insérer pour une question. */
function buildCritereTwinRow(key: string, nomCourt: string | null, twin: CritereTwin) {
  return {
    id: randomUUID(),
    identifiant_tech: key,
    id_categorie: twin.id_categorie,
    parent_id: twin.parent_id,
    type: twin.type,
    is_parent: false,
    is_enfant: true,
    nom_court: nomCourt,
  }
}

export async function createQuestion(
  sectionId: string,
  key: string,
  question: string,
  critereMajeur: QuestionnaireQuestion['critere_majeur'],
  ordre: number,
  nomCourt: string
) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const nom_court = nomCourt?.trim() || null

  // Résoudre le jumeau AVANT toute écriture : si ça échoue, on n'écrit rien (pas de demi-synchro).
  const twin = await resolveCritereTwin(supabase, sectionId, critereMajeur)
  if ('error' in twin) return { error: twin.error }

  const { data, error } = await supabase
    .from('questionnaire_questions')
    .insert({ section_id: sectionId, key, question, critere_majeur: critereMajeur, ordre, nom_court })
    .select('id, section_id, key, question, critere_majeur, ordre, nom_court')
    .single()
  if (error) return { error: error.message }

  const { error: twinError } = await supabase.from('criteres').insert(buildCritereTwinRow(key, nom_court, twin))
  if (twinError) {
    // Rollback de la question pour préserver l'invariant « 0 orphelin ».
    await supabase.from('questionnaire_questions').delete().eq('id', data.id)
    return { error: `Jumeau criteres : ${twinError.message}` }
  }

  revalidatePath('/admin/questionnaires')
  return { question: data }
}

export async function updateQuestion(
  id: string,
  key: string,
  question: string,
  critereMajeur: QuestionnaireQuestion['critere_majeur'],
  nomCourt: string
) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const nom_court = nomCourt?.trim() || null

  // Lire l'ANCIENNE clé (lien mou key ↔ identifiant_tech) + la section pour re-résoudre le parent.
  const { data: existing } = await supabase
    .from('questionnaire_questions')
    .select('key, section_id')
    .eq('id', id)
    .single()
  if (!existing) return { error: 'Question introuvable' }

  const twin = await resolveCritereTwin(supabase, existing.section_id, critereMajeur)
  if ('error' in twin) return { error: twin.error }

  const { error } = await supabase
    .from('questionnaire_questions')
    .update({ key, question, critere_majeur: critereMajeur, nom_court })
    .eq('id', id)
  if (error) return { error: error.message }

  // Mettre le jumeau en phase (clé, parent selon le nouveau majeur, libellé court).
  // Auto-réparation : si aucun jumeau (donnée historique), on le crée.
  const { data: twinRow } = await supabase
    .from('criteres')
    .select('id')
    .eq('is_enfant', true)
    .eq('identifiant_tech', existing.key)
    .maybeSingle()

  if (twinRow?.id) {
    await supabase
      .from('criteres')
      .update({ identifiant_tech: key, parent_id: twin.parent_id, nom_court })
      .eq('id', twinRow.id)
  } else {
    await supabase.from('criteres').insert(buildCritereTwinRow(key, nom_court, twin))
  }

  revalidatePath('/admin/questionnaires')
}

export async function deleteQuestion(id: string) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()

  // Récupérer la clé pour supprimer aussi le jumeau `criteres`.
  const { data: existing } = await supabase
    .from('questionnaire_questions')
    .select('key')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('questionnaire_questions')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }

  if (existing?.key) {
    await supabase.from('criteres').delete().eq('is_enfant', true).eq('identifiant_tech', existing.key)
  }

  revalidatePath('/admin/questionnaires')
}

// Pas de miroir `criteres` : les enfants n'ont pas de colonne `ordre` (l'ordre d'affichage
// est porté uniquement par `questionnaire_questions.ordre`).
export async function reorderQuestions(orderedIds: string[]) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('questionnaire_questions').update({ ordre: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/questionnaires')
}
