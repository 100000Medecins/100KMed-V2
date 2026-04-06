'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
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
  const supabase: DB = createServiceRoleClient()

  const slug = categorieSlug || 'default'

  const { data: sections } = await supabase
    .from('questionnaire_sections')
    .select('id, categorie_slug, titre, introduction, ordre')
    .eq('categorie_slug', slug)
    .order('ordre', { ascending: true })

  if (!sections || sections.length === 0) {
    // Fallback sur le questionnaire par défaut
    if (slug !== 'default') return getSectionsForSlug('default')
    return []
  }

  const sectionIds = sections.map((s: QuestionnaireSection) => s.id)

  const { data: questions } = await supabase
    .from('questionnaire_questions')
    .select('id, section_id, key, question, critere_majeur, ordre')
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
  const slugs = [...new Set((data ?? []).map((r: { categorie_slug: string }) => r.categorie_slug))]
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

export async function createQuestion(
  sectionId: string,
  key: string,
  question: string,
  critereMajeur: QuestionnaireQuestion['critere_majeur'],
  ordre: number
) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { data, error } = await supabase
    .from('questionnaire_questions')
    .insert({ section_id: sectionId, key, question, critere_majeur: critereMajeur, ordre })
    .select('id, section_id, key, question, critere_majeur, ordre')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
  return { question: data }
}

export async function updateQuestion(
  id: string,
  key: string,
  question: string,
  critereMajeur: QuestionnaireQuestion['critere_majeur']
) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase
    .from('questionnaire_questions')
    .update({ key, question, critere_majeur: critereMajeur })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
}

export async function deleteQuestion(id: string) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase
    .from('questionnaire_questions')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires')
}

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
