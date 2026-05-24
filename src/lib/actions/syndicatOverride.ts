'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Override HTML par syndicat pour le mail de lancement.
 *
 * Stocké dans pages_statiques.metadata[i].contenu_html_override (string | undefined).
 * Si présent et non vide, ce HTML remplace le template général
 * (email_templates.lancement_syndicat) pour CE syndicat uniquement.
 *
 * Les placeholders {{...}} restent interpolés à la composition (compose côté admin
 * et côté generate-lancement-syndicats.mjs), pour rester robuste si les infos du
 * syndicat (nom, citation, président, logo) changent par la suite.
 */

async function updateSyndicatField(syndicatId: string, mutate: (entry: Record<string, unknown>) => Record<string, unknown>) {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pages_statiques')
    .select('metadata')
    .eq('slug', 'qui-sommes-nous')
    .single()
  if (error || !data) throw new Error(error?.message || 'Page « qui-sommes-nous » introuvable')

  const arr = Array.isArray(data.metadata) ? data.metadata : []
  let touched = false
  const newArr = arr.map((entry: Record<string, unknown>) => {
    if (entry?.id !== syndicatId) return entry
    touched = true
    return mutate(entry)
  })
  if (!touched) throw new Error(`Syndicat « ${syndicatId} » introuvable dans pages_statiques.metadata`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upErr } = await (supabase as any)
    .from('pages_statiques')
    .update({ metadata: newArr })
    .eq('slug', 'qui-sommes-nous')
  if (upErr) throw new Error(upErr.message)
}

export async function saveSyndicatOverride(syndicatId: string, contenuHtml: string) {
  if (!syndicatId) throw new Error('syndicatId requis')
  await updateSyndicatField(syndicatId, (entry) => ({ ...entry, contenu_html_override: contenuHtml }))
  revalidatePath('/admin/emails')
  return { status: 'SUCCESS' as const }
}

export async function clearSyndicatOverride(syndicatId: string) {
  if (!syndicatId) throw new Error('syndicatId requis')
  await updateSyndicatField(syndicatId, (entry) => {
    const { contenu_html_override: _drop, ...rest } = entry as Record<string, unknown>
    return rest
  })
  revalidatePath('/admin/emails')
  return { status: 'SUCCESS' as const }
}
