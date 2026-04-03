'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getEmailTemplate(id: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, sujet, contenu_html, updated_at')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveEmailTemplate(id: string, sujet: string, contenuHtml: string) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('email_templates')
    .upsert({ id, sujet, contenu_html: contenuHtml, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/emails')
  return { status: 'SUCCESS' }
}
