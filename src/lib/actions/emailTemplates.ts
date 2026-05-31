'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface EmailTemplate {
  id: string
  sujet: string
  contenu_html: string
  /** Libellé court injecté dans le master_layout via `{{label}}` (ex. "Fusion de comptes"). */
  label: string | null
  updated_at: string | null
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, sujet, contenu_html, label, updated_at')
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

/**
 * Compose un email final en injectant le contenu du template dans le master layout.
 * Fallback : si le master_layout n'existe pas encore en BDD, utilise le template tel quel
 * (rétro-compatible le temps que le layout soit configuré).
 *
 * `layoutId` permet d'utiliser un autre layout que `master_layout` (ex. `master_layout_test`
 * pour le bac à sable, qui ne doit jamais toucher au layout de production).
 */
export async function buildEmail(
  templateId: string,
  vars: Record<string, string>,
  siteUrl: string,
  layoutId: string = 'master_layout'
): Promise<{ sujet: string; html: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const [{ data: template }, { data: layout }] = await Promise.all([
    supabase.from('email_templates').select('sujet, contenu_html, label').eq('id', templateId).maybeSingle(),
    supabase.from('email_templates').select('contenu_html').eq('id', layoutId).maybeSingle(),
  ])

  if (!template?.contenu_html) return null

  const contentHtml = template.contenu_html as string
  const layoutHtml: string | undefined = layout?.contenu_html
  const label: string = (template.label as string | null) ?? ''

  // N'injecter dans le layout que si le template ne contient pas déjà un document HTML complet.
  // Cela permet une migration progressive : les templates encore en full-HTML fonctionnent
  // tel quel, les templates migrés en contenu seul sont encapsulés dans le master_layout.
  const isFullDocument = contentHtml.trim().toLowerCase().startsWith('<!doctype')
  let html: string = (!isFullDocument && layoutHtml?.includes('{{contenu}}'))
    ? layoutHtml.replace(/\{\{contenu\}\}/g, contentHtml)
    : contentHtml

  // Le label vit en BDD (champ `email_templates.label`) et s'injecte dans le master_layout
  // à droite du logo. Substitué AVANT les autres vars pour qu'un éventuel {{label}} dans
  // un template appelant ne casse pas la logique.
  html = html.replace(/\{\{label\}\}/g, label)

  html = html.replace(/https?:\/\/(?:www\.)?100000medecins\.org/g, siteUrl)
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }

  // Fallback : si le master_layout contient {{lien_desabonnement}} mais que le template
  // appelant ne l'a pas passé en vars, on le remplace par la page « Gérer mes notifications »
  // (lien public qui demande une auth si l'utilisateur n'est pas connecté).
  // Évite que `{{lien_desabonnement}}` apparaisse littéralement dans le mail.
  html = html.replace(/\{\{lien_desabonnement\}\}/g, `${siteUrl}/mon-compte/mes-notifications`)

  let sujet: string = template.sujet as string
  for (const [key, value] of Object.entries(vars)) {
    sujet = sujet.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }

  return { sujet, html }
}
