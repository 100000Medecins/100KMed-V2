import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export type AppSettingKey = 'display_prix_front' | 'display_contacts_commerciaux'

/**
 * Lit une cle de reglage globale.
 * Lecture publique (RLS autorise anon/authenticated en SELECT).
 */
export async function getAppSetting<T = unknown>(key: AppSettingKey, fallback: T): Promise<T> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return fallback
    return data.value as T
  } catch {
    return fallback
  }
}

/**
 * Ecriture admin (service_role).
 */
export async function setAppSetting(key: AppSettingKey, value: unknown): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value: value as never }, { onConflict: 'key' })
  if (error) throw error
}

/** Helper specifique : toggle d'affichage des prix sur le front (defaut OFF). */
export async function getDisplayPrixFront(): Promise<boolean> {
  const v = await getAppSetting<boolean>('display_prix_front', false)
  return v === true
}

/**
 * Helper specifique : toggle d'affichage du bloc "Contacts commerciaux" sur les fiches solutions (defaut OFF).
 * Quand OFF, le sous-bloc commercial (email/tel pour demande de demo/devis) est masque
 * partout sur le front. Le sous-bloc support (SAV) reste affiche.
 */
export async function getDisplayContactsCommerciaux(): Promise<boolean> {
  const v = await getAppSetting<boolean>('display_contacts_commerciaux', false)
  return v === true
}
