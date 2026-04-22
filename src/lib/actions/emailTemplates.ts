'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface EmailTemplate {
  id: string
  sujet: string
  contenu_html: string
  updated_at: string | null
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, sujet, contenu_html, updated_at')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as unknown as EmailTemplate | null
}

export async function saveEmailTemplate(id: string, sujet: string, contenuHtml: string) {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('email_templates')
    .upsert({ id, sujet, contenu_html: contenuHtml, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/emails')
  return { status: 'SUCCESS' }
}
