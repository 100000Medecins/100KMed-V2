import { createServiceRoleClient } from '@/lib/supabase/server'

export type AppSettingKey = 'display_prix_front' | 'display_contacts_commerciaux' | 'annuaire_actif'

/**
 * Lit une cle de reglage globale.
 * Lecture publique (RLS autorise anon/authenticated en SELECT).
 */
export async function getAppSetting<T = unknown>(key: AppSettingKey, fallback: T): Promise<T> {
  try {
    // Réglage global public (RLS autorise anon en SELECT). On utilise le service role
    // plutôt que createServerClient afin de NE PAS lire cookies() : sinon une page
    // publique en ISR (revalidate) qui appelle getDisplayPrixFront bascule
    // « static → dynamic at runtime » → 500. Données identiques (table publique).
    const supabase = createServiceRoleClient()
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

/**
 * Annuaire mutualisé allumé d'office pour cet environnement (`ANNUAIRE_FORCER_ACTIF=true` :
 * postes locaux, Vercel Preview). Le réglage en base est commun à tous les environnements
 * (une seule base) : l'allumer pour un essai l'allumerait aussi en production.
 */
export function annuaireForceIci(): boolean {
  return process.env.ANNUAIRE_FORCER_ACTIF === 'true'
}

/** Réglage `annuaire_actif` en base seul (défaut OFF) — c'est lui qui pilote la production. */
export async function getAnnuaireActifEnBase(): Promise<boolean> {
  const v = await getAppSetting<boolean>('annuaire_actif', false)
  return v === true
}

/**
 * Interrupteur effectif de l'annuaire mutualisé. Éteint : ni menu, ni page, ni écriture
 * de la preuve de connexion PSC (`identites_psc`).
 */
export async function getAnnuaireActif(): Promise<boolean> {
  return annuaireForceIci() || (await getAnnuaireActifEnBase())
}
