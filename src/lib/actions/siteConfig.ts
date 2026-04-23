'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSiteConfig(cle: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('site_config')
    .select('valeur')
    .eq('cle', cle)
    .maybeSingle()
  return data?.valeur ?? null
}

export async function setSiteConfig(cle: string, valeur: string): Promise<void> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('site_config')
    .upsert({ cle, valeur })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/emails')
}
