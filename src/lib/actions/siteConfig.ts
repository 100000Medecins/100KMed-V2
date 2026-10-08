'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import { revalidatePath } from 'next/cache'
import { roleAdmin } from '@/lib/auth/admin-guard'

// Réglages que le rôle « contenus » peut modifier : ceux de la rubrique Emails.
const CLES_CONTENU = ['crons_routiniers_actifs', 'excuse_draft_html', 'excuse_draft_sujet']

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
  const role = await roleAdmin()
  if (role !== 'admin' && !(role === 'contenu' && CLES_CONTENU.includes(cle))) throw new Error('Non autorisé')
  const supabase = createServiceRoleClient()
  // Valeur précédente pour le diff du flux de supervision
  const ancienne = await getSiteConfig(cle)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('site_config')
    .upsert({ cle, valeur })
  if (error) throw new Error(error.message)

  // Flux de supervision admin : changement de paramètre global (uniquement si la valeur change)
  if (ancienne !== valeur) {
    await logActivity({
      type: ACTIVITY_TYPES.ADMIN_PARAMETRE,
      acteurType: 'admin',
      acteurLabel: role === 'admin' ? 'Admin' : 'Contenus',
      cibleType: 'parametre',
      cibleLabel: cle,
      diff: { valeur: { avant: ancienne, apres: valeur } },
    })
  }

  revalidatePath('/admin/emails')
}
