'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export interface NotificationPreferences {
  relance_emails: boolean
  marketing_emails: boolean
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('users_notification_preferences')
    .select('relance_emails, marketing_emails')
    .eq('user_id', user.id)
    .single()

  // Defaults: tout activé si pas encore de préférences enregistrées
  return {
    relance_emails: data?.relance_emails ?? true,
    marketing_emails: data?.marketing_emails ?? true,
  }
}

export async function updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('users_notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) throw new Error(error.message)
  return { status: 'SUCCESS' }
}
