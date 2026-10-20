import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/server'
import {
  lireTextesPortabilite,
  SLUG_PAGE_PORTABILITE,
  TEXTES_PORTABILITE_DEFAUT,
  type TextesPortabilite,
} from '@/lib/data/portabilite'

/**
 * Textes libres de la page (Admin → Pages, ligne `portabilite`). Partagé par la page et ses
 * métadonnées (une seule lecture par rendu). Erreur ou ligne absente → textes par défaut : la
 * page ne tombe jamais en erreur pour ça.
 */
export const getTextesPortabilite = cache(async (): Promise<TextesPortabilite> => {
  const { data, error } = await createPublicClient()
    .from('pages_statiques')
    .select('titre, meta_description, contenu')
    .eq('slug', SLUG_PAGE_PORTABILITE)
    .maybeSingle()
  if (error) {
    console.error('[getTextesPortabilite]', error.message)
    return { ...TEXTES_PORTABILITE_DEFAUT }
  }
  return lireTextesPortabilite(data)
})

export type EditeurPortabilite = {
  slug: string
  nom: string
  logo_url: string | null
}

export type LogicielPortabilite = {
  slug: string
  nom: string
  logo_url: string | null
  /** Lien vers la fiche, ou null si la fiche n'est pas visible (inactive, catégorie masquée). */
  href: string | null
}

/**
 * Logos, noms et liens des éditeurs et logiciels de la page /portabilite.
 *
 * Client public (sans cookies) : la page reste statique. Contenu non critique : en cas d'erreur,
 * on journalise et la page s'affiche avec les noms de la liste, sans logos ni liens de fiche.
 */
export async function getDonneesPortabilite(
  slugsEditeurs: string[],
  slugsLogiciels: string[],
): Promise<{
  editeurs: Map<string, EditeurPortabilite>
  logiciels: Map<string, LogicielPortabilite>
}> {
  const supabase = createPublicClient()

  const [editeursRes, logicielsRes] = await Promise.all([
    supabase.from('editeurs').select('slug, nom, nom_commercial, logo_url').in('slug', slugsEditeurs),
    supabase
      .from('solutions')
      .select('slug, nom, logo_url, categorie:categories!inner(slug, actif)')
      .in('slug', slugsLogiciels)
      .eq('actif', true)
      .eq('categorie.actif', true),
  ])

  const editeurs = new Map<string, EditeurPortabilite>()
  if (editeursRes.error) {
    console.error('[getDonneesPortabilite] éditeurs :', editeursRes.error.message)
  } else {
    for (const e of editeursRes.data) {
      editeurs.set(e.slug, { slug: e.slug, nom: e.nom_commercial || e.nom || e.slug, logo_url: e.logo_url })
    }
  }

  const logiciels = new Map<string, LogicielPortabilite>()
  if (logicielsRes.error) {
    console.error('[getDonneesPortabilite] logiciels :', logicielsRes.error.message)
  } else {
    for (const s of logicielsRes.data) {
      if (!s.slug) continue
      const catSlug = s.categorie?.slug
      logiciels.set(s.slug, {
        slug: s.slug,
        nom: s.nom,
        logo_url: s.logo_url,
        href: catSlug ? `/solutions/${catSlug}/${s.slug}` : null,
      })
    }
  }

  return { editeurs, logiciels }
}
