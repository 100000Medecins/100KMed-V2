'use server'

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

export async function createGroupe(nom: string): Promise<{ error?: string; groupe?: { id: string; nom: string; ordre: number } }> {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('groupes_categories')
    .select('ordre')
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrdre = existing ? (existing.ordre as number) + 1 : 0
  const newId = randomUUID()
  const { error } = await supabase
    .from('groupes_categories')
    .insert({ id: newId, nom, ordre: nextOrdre })
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
  return { groupe: { id: newId, nom, ordre: nextOrdre } }
}

export async function updateGroupe(id: string, nom: string) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase
    .from('groupes_categories')
    .update({ nom })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function deleteGroupe(id: string) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase.from('groupes_categories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function reorderGroupes(orderedIds: string[]) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('groupes_categories').update({ ordre: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function updateCategorieGroupe(categorieId: string, groupeId: string | null) {
  await assertAdmin()
  const supabase: DB = createServiceRoleClient()
  const { error } = await supabase
    .from('categories')
    .update({ groupe_id: groupeId })
    .eq('id', categorieId)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}
