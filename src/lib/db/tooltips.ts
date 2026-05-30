import { createServerClient } from '@/lib/supabase/server'

export interface NoteGlobaleTooltip {
  tooltip_court_legacy: string
  tooltip_court_standard: string
  tooltip_long_titre: string
  tooltip_long_corps: string
}

const SLUG = 'tooltip-note-globale'

function isValidTooltip(obj: unknown): obj is NoteGlobaleTooltip {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.tooltip_court_legacy === 'string' &&
    typeof o.tooltip_court_standard === 'string' &&
    typeof o.tooltip_long_titre === 'string' &&
    typeof o.tooltip_long_corps === 'string'
  )
}

/**
 * Lit le contenu JSON de pages_statiques slug='tooltip-note-globale' et le parse.
 * Retourne null en cas d'erreur ou de structure invalide (log côté serveur).
 * Pas de fallback silencieux : le composant qui consomme doit gérer le null
 * (typiquement : ne pas afficher la tooltip plutôt qu'un texte hardcodé périmé).
 */
export async function getNoteGlobaleTooltip(): Promise<NoteGlobaleTooltip | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('pages_statiques')
    .select('contenu')
    .eq('slug', SLUG)
    .maybeSingle()

  if (error) {
    console.error(`[getNoteGlobaleTooltip] erreur Supabase :`, error.message)
    return null
  }
  if (!data?.contenu) {
    console.warn(`[getNoteGlobaleTooltip] ligne ${SLUG} absente ou contenu vide`)
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(data.contenu as string)
  } catch (e) {
    console.error(`[getNoteGlobaleTooltip] JSON invalide :`, (e as Error).message)
    return null
  }

  if (!isValidTooltip(parsed)) {
    console.error(`[getNoteGlobaleTooltip] structure invalide :`, Object.keys((parsed as object) ?? {}))
    return null
  }

  return parsed
}
