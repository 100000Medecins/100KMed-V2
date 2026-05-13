'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyNotifToken } from '@/lib/email/notif-token'
import type { NotificationPreferences } from './notifications'

type AuthArgs = { uid: string; iat: number; token: string }

export async function getPrefsByToken(args: AuthArgs): Promise<
  | { status: 'ok'; prefs: NotificationPreferences; isEditeur: boolean }
  | { status: 'invalid' | 'expired' | 'not_found' }
> {
  const result = verifyNotifToken(args.uid, args.iat, args.token)
  if (result !== 'ok') return { status: result }

  const admin = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user } = await (admin as any)
    .from('users')
    .select('mode_exercice, role')
    .eq('id', args.uid)
    .maybeSingle()

  if (!user) return { status: 'not_found' }

  const isEditeur = user.mode_exercice === 'Éditeur' || user.role === 'editeur'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('users_notification_preferences')
    .select('relance_emails, marketing_emails, etudes_cliniques, questionnaires_these')
    .eq('user_id', args.uid)
    .maybeSingle()

  return {
    status: 'ok',
    isEditeur,
    prefs: {
      relance_emails: data?.relance_emails ?? true,
      marketing_emails: data?.marketing_emails ?? true,
      etudes_cliniques: data?.etudes_cliniques ?? false,
      questionnaires_these: data?.questionnaires_these ?? false,
    },
  }
}

export async function updatePrefsByToken(
  args: AuthArgs & { prefs: Partial<NotificationPreferences> },
): Promise<{ status: 'ok' } | { status: 'invalid' | 'expired' } | { status: 'error'; message: string }> {
  const result = verifyNotifToken(args.uid, args.iat, args.token)
  if (result !== 'ok') return { status: result }

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('users_notification_preferences')
    .upsert(
      { user_id: args.uid, ...args.prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) return { status: 'error', message: error.message }
  return { status: 'ok' }
}
