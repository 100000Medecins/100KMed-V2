'use server'

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateUniqueEditeurSlug } from '@/lib/db/editeurs'

// ────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 jours
  path: '/',
}

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string

  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Mot de passe incorrect' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_token', generateToken(), ADMIN_COOKIE_OPTIONS)

  redirect('/admin/solutions')
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_token')
  redirect('/admin')
}

// ────────────────────────────────────────────
// Guard
// ────────────────────────────────────────────

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) {
    redirect('/admin')
  }
  // Renouveler le cookie à chaque action pour éviter l'expiration en cours de session
  cookieStore.set('admin_token', token!, ADMIN_COOKIE_OPTIONS)
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

// ────────────────────────────────────────────
// Solution CRUD
// ────────────────────────────────────────────

function extractSolutionFromFormData(formData: FormData) {
  const nom = formData.get('nom') as string
  const slug = (formData.get('slug') as string) || slugify(nom)
  return {
    nom,
    slug,
    description: (formData.get('description') as string) || null,
    id_categorie: (formData.get('categorie_id') as string) || null,
    id_editeur: (formData.get('editeur_id') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    logo_titre: (formData.get('logo_titre') as string) || null,
    website: (formData.get('website_url') as string) || null,
    evaluation_redac_avis: (formData.get('evaluation_redac_avis') as string) || null,
    evaluation_redac_points_forts: (formData.get('evaluation_redac_points_forts') as string)
      ? (formData.get('evaluation_redac_points_forts') as string).split('\n').filter(Boolean)
      : null,
    evaluation_redac_points_faibles: (formData.get('evaluation_redac_points_faibles') as string)
      ? (formData.get('evaluation_redac_points_faibles') as string).split('\n').filter(Boolean)
      : null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
    contact_email: (formData.get('contact_email') as string) || null,
    contact_telephone: (formData.get('contact_telephone') as string) || null,
    support_email: (formData.get('support_email') as string) || null,
    support_telephone: (formData.get('support_telephone') as string) || null,
    support_website: (formData.get('support_website') as string) || null,
    prix_ttc: formData.get('prix_ttc') ? Number(formData.get('prix_ttc')) : null,
    prix_ttc_min: formData.get('prix_ttc_min') ? Number(formData.get('prix_ttc_min')) : null,
    prix_ttc_max: formData.get('prix_ttc_max') ? Number(formData.get('prix_ttc_max')) : null,
    prix_devise: (formData.get('prix_devise') as string) || null,
    prix_frequence: (formData.get('prix_frequence') as string) || null,
    prix_duree_engagement_mois: formData.get('prix_duree_engagement_mois') ? Number(formData.get('prix_duree_engagement_mois')) : null,
    meta: (() => {
      const t = (formData.get('meta_title') as string) || null
      const d = (formData.get('meta_description') as string) || null
      const c = (formData.get('meta_canonical') as string) || null
      return (t || d || c) ? { title: t, description: d, canonical: c } : null
    })(),
  }
}

async function syncGalerie(supabase: ReturnType<typeof createServiceRoleClient>, solutionId: string, galerieJson: string) {
  let images: Array<{ url: string; titre: string; ordre: number; type?: string | null }> = []
  try {
    images = JSON.parse(galerieJson)
  } catch {
    return
  }

  // Supprimer les images existantes
  await supabase
    .from('solutions_galerie')
    .delete()
    .eq('id_solution', solutionId)

  // Insérer les nouvelles images
  if (images.length > 0) {
    const rows = images
      .filter((img) => img.url.trim() !== '')
      .map((img) => ({
        id_solution: solutionId,
        url: img.url,
        titre: img.titre || null,
        ordre: img.ordre ?? 0,
        type: img.type || null,
      }))

    if (rows.length > 0) {
      await supabase.from('solutions_galerie').insert(rows)
    }
  }
}

async function syncCritereComments(
  supabase: ReturnType<typeof createServiceRoleClient>,
  solutionId: string,
  criteresJson: string
) {
  let items: Array<{ critere_id: string; avis_redac: string | null; note_redac_base5: number | null }> = []
  try {
    items = JSON.parse(criteresJson)
  } catch {
    return
  }

  for (const item of items) {
    if (!item.critere_id) continue

    // Chercher un résultat existant
    const { data: existing } = await supabase
      .from('resultats')
      .select('id')
      .eq('solution_id', solutionId)
      .eq('critere_id', item.critere_id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('resultats')
        .update({
          avis_redac: item.avis_redac,
          note_redac_base5: item.note_redac_base5,
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('resultats')
        .insert({
          solution_id: solutionId,
          critere_id: item.critere_id,
          avis_redac: item.avis_redac,
          note_redac_base5: item.note_redac_base5,
        })
    }
  }
}

export async function createSolution(formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()
  const data = extractSolutionFromFormData(formData)

  const { data: inserted, error } = await supabase
    .from('solutions')
    .insert(data)
    .select('id, categorie:categories(id)')
    .single()

  if (error || !inserted) {
    return { error: `Erreur lors de la création : ${error?.message ?? 'Erreur inconnue'}` }
  }

  // Synchroniser la galerie
  const galerieJson = formData.get('galerie_json') as string
  if (galerieJson) {
    await syncGalerie(supabase, inserted.id, galerieJson)
  }

  // Synchroniser les avis par critère (le trigger DB recalcule evaluation_redac_note)
  const criteresJson = formData.get('criteres_avis_json') as string
  if (criteresJson) {
    await syncCritereComments(supabase, inserted.id, criteresJson)
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect('/admin/solutions')
}

export async function updateSolution(id: string, formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()
  const data = extractSolutionFromFormData(formData)

  // Si le bouton "Mettre à jour et activer" a été cliqué
  const activer = formData.get('_activer') === 'true'
  if (activer) {
    (data as Record<string, unknown>).actif = true
  }

  const { error } = await supabase
    .from('solutions')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: `Erreur lors de la mise à jour : ${error.message}` }
  }

  // Synchroniser la galerie
  const galerieJson = formData.get('galerie_json') as string
  if (galerieJson) {
    await syncGalerie(supabase, id, galerieJson)
  }

  // Synchroniser les avis par critère (le trigger DB recalcule evaluation_redac_note)
  const criteresJson = formData.get('criteres_avis_json') as string
  if (criteresJson) {
    await syncCritereComments(supabase, id, criteresJson)
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect(`/admin/solutions?scroll=${id}`)
}

export async function deleteSolution(id: string) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('solutions')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Erreur lors de la suppression : ${error.message}` }
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect('/admin/solutions')
}

// ────────────────────────────────────────────
// Categorie CRUD
// ────────────────────────────────────────────

function extractCategorieFromFormData(formData: FormData) {
  const nom = formData.get('nom') as string
  const slug = (formData.get('slug') as string) || slugify(nom)
  return {
    nom,
    slug,
    icon: (formData.get('icon') as string) || null,
    intro: (formData.get('intro') as string) || null,
    image_url: (formData.get('image_url') as string) || null,
    label_filtres: (formData.get('label_filtres') as string) || null,
    has_note_redac: formData.get('has_note_redac') !== 'false',
  }
}

export async function createCategorie(formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()
  const data = extractCategorieFromFormData(formData)

  const { error } = await supabase
    .from('categories')
    .insert({ id: randomUUID(), ...data })

  if (error) {
    return { error: `Erreur lors de la création : ${error.message}` }
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect('/admin/categories')
}

export async function updateCategorie(id: string, formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()
  const data = extractCategorieFromFormData(formData)

  const { error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: `Erreur lors de la mise à jour : ${error.message}` }
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect('/admin/categories')
}

export async function updateCategorieImageUrl(id: string, imageUrl: string | null) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('categories')
    .update({ image_url: imageUrl })
    .eq('id', id)
  if (error) return { error: error.message }
}

export async function updateCategorieLabelFiltres(id: string, labelFiltres: string | null) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('categories').update({ label_filtres: labelFiltres }).eq('id', id)
  revalidatePath('/admin/categories')
  revalidatePath('/solutions', 'layout')
}

export async function reorderCategories(orderedIds: string[]) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('categories').update({ position: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/categories')
  revalidatePath('/solutions', 'layout')
}

// ────────────────────────────────────────────
// Groupes de catégories CRUD
// ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export async function createGroupe(nom: string) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('groupes_categories')
    .select('ordre')
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrdre = existing ? (existing.ordre as number) + 1 : 0
  const { error } = await supabase
    .from('groupes_categories')
    .insert({ id: randomUUID(), nom, ordre: nextOrdre })
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function updateGroupe(id: string, nom: string) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  const { error } = await supabase
    .from('groupes_categories')
    .update({ nom })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function deleteGroupe(id: string) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  const { error } = await supabase.from('groupes_categories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function reorderGroupes(orderedIds: string[]) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('groupes_categories').update({ ordre: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function updateCategorieGroupe(categorieId: string, groupeId: string | null) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  const { error } = await supabase
    .from('categories')
    .update({ groupe_id: groupeId })
    .eq('id', categorieId)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/comparatifs')
  revalidatePath('/', 'layout')
}

export async function toggleSolutionActif(id: string, actif: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('solutions').update({ actif }).eq('id', id)
  if (error) return { error: `Erreur : ${error.message}` }
  revalidatePath('/admin/solutions')
  revalidatePath('/solutions', 'layout')
}

export async function toggleCategorieActif(id: string, actif: boolean) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('categories')
    .update({ actif })
    .eq('id', id)

  if (error) {
    return { error: `Erreur : ${error.message}` }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/solutions', 'layout')
}

export async function deleteCategorie(id: string, force = false) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  // Vérifier si des solutions sont rattachées
  const { count } = await supabase
    .from('solutions')
    .select('id', { count: 'exact', head: true })
    .eq('id_categorie', id)

  if (count && count > 0 && !force) {
    return {
      error: `Cette catégorie contient ${count} solution${count > 1 ? 's' : ''}. Voulez-vous la supprimer quand même ?`,
      needsForce: true,
    }
  }

  // Détacher les solutions si force
  if (count && count > 0) {
    await supabase
      .from('solutions')
      .update({ id_categorie: null })
      .eq('id_categorie', id)
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Erreur lors de la suppression : ${error.message}` }
  }

  revalidatePath('/admin', 'layout')
  revalidatePath('/solutions', 'layout')
  redirect('/admin/categories')
}

// ────────────────────────────────────────────
// Pages Statiques (Blog)
// ────────────────────────────────────────────

export async function createPageStatique(formData: FormData): Promise<void> {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const slug = (formData.get('slug') as string).trim()
  const titre = (formData.get('titre') as string).trim()
  if (!slug || !titre) redirect('/admin/pages')

  const { error } = await supabase.from('pages_statiques').insert({
    id: randomUUID(),
    slug,
    titre,
    contenu: null,
    meta_description: null,
  })
  if (error) redirect('/admin/pages')

  revalidatePath('/admin/pages')
  redirect('/admin/pages')
}

export async function updatePageStatique(id: string, formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  const metadataRaw = formData.get('metadata') as string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    titre: formData.get('titre') as string,
    image_couverture: (formData.get('image_couverture') as string) || null,
    contenu: (formData.get('contenu') as string) || null,
    meta_description: (formData.get('meta_description') as string) || null,
  }
  if (metadataRaw) {
    try {
      updateData.metadata = JSON.parse(metadataRaw)
    } catch {
      return { error: 'Format des membres fondateurs invalide.' }
    }
  }

  const { error } = await supabase
    .from('pages_statiques')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: `Erreur lors de la mise à jour : ${error.message}` }
  }

  // Récupérer le slug pour revalider la page publique
  const { data: page } = await supabase
    .from('pages_statiques')
    .select('slug')
    .eq('id', id)
    .single()

  revalidatePath('/admin/pages')
  if (page?.slug) {
    revalidatePath(`/${page.slug}`)
  }

  redirect('/admin/pages')
}

/**
 * Restaure une page statique à partir d'une entrée d'historique.
 * UPDATE pages_statiques avec les valeurs de la version archivée → déclenche
 * automatiquement le trigger d'audit qui archive l'état actuel (donc on peut
 * « annuler » une restauration en restaurant la version intermédiaire).
 */
export async function restorePageStatique(pageId: string, historyId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entry, error: histErr } = await (supabase as any)
    .from('pages_statiques_history')
    .select('*')
    .eq('id', historyId)
    .eq('page_id', pageId)
    .single()
  if (histErr || !entry) return { error: 'Version historisée introuvable.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase as any)
    .from('pages_statiques')
    .update({
      titre: entry.titre,
      contenu: entry.contenu,
      meta_description: entry.meta_description,
      image_couverture: entry.image_couverture,
      metadata: entry.metadata,
    })
    .eq('id', pageId)
  if (updErr) return { error: `Erreur restauration : ${updErr.message}` }

  // Revalidation : la fiche admin + la page publique
  const slug = entry.slug as string | null
  revalidatePath('/admin/pages')
  revalidatePath(`/admin/pages/${pageId}/modifier`)
  if (slug) revalidatePath(`/${slug}`)
  return { success: true }
}

/**
 * Action dédiée pour la tooltip note globale (slug 'tooltip-note-globale').
 * Valide les 4 champs structurés, les sérialise en JSON dans pages_statiques.contenu,
 * puis revalide les fiches solutions qui consomment la tooltip.
 */
export async function updateNoteGlobaleTooltip(id: string, formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  const tooltip_court_legacy = ((formData.get('tooltip_court_legacy') as string) || '').trim()
  const tooltip_court_standard = ((formData.get('tooltip_court_standard') as string) || '').trim()
  const tooltip_long_titre = ((formData.get('tooltip_long_titre') as string) || '').trim()
  const tooltip_long_corps = ((formData.get('tooltip_long_corps') as string) || '').trim()
  // Checkbox HTML : présente dans formData uniquement si cochée. Si absente = false.
  const modale_active = formData.get('modale_active') === 'on'

  if (!tooltip_court_legacy || !tooltip_court_standard) {
    return { error: 'Les deux textes courts sont obligatoires.' }
  }
  if (modale_active && (!tooltip_long_titre || !tooltip_long_corps)) {
    return { error: 'Le titre et le corps de la modale sont obligatoires quand la modale est activée.' }
  }
  if (tooltip_court_legacy.length > 300 || tooltip_court_standard.length > 300) {
    return { error: 'Les textes courts ne doivent pas dépasser 300 caractères.' }
  }

  const contenu = JSON.stringify({
    tooltip_court_legacy,
    tooltip_court_standard,
    tooltip_long_titre,
    tooltip_long_corps,
    modale_active,
  })

  const { error } = await supabase
    .from('pages_statiques')
    .update({ contenu })
    .eq('id', id)

  if (error) return { error: `Erreur lors de la mise à jour : ${error.message}` }

  revalidatePath('/admin/pages')
  // Revalider les listings de solutions (les fiches utilisent revalidate=300, donc max 5min de cache)
  revalidatePath('/solutions', 'layout')

  redirect('/admin/pages')
}

// ────────────────────────────────────────────
// Partenaires
// ────────────────────────────────────────────

export async function createPartenaire(formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('partenaires').insert({
    id: randomUUID(),
    nom: formData.get('nom') as string,
    logo_url: (formData.get('logo_url') as string) || null,
    lien_url: (formData.get('lien_url') as string) || null,
    actif: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/partenaires')
  revalidatePath('/')
  redirect('/admin/partenaires')
}

export async function updatePartenaire(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('partenaires').update({
    nom: formData.get('nom') as string,
    logo_url: (formData.get('logo_url') as string) || null,
    lien_url: (formData.get('lien_url') as string) || null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/partenaires')
  revalidatePath('/')
  redirect('/admin/partenaires')
}

export async function deletePartenaire(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('partenaires').delete().eq('id', id)
  revalidatePath('/admin/partenaires')
  revalidatePath('/')
}

export async function togglePartenaireActif(id: string, actif: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('partenaires').update({ actif }).eq('id', id)
  revalidatePath('/admin/partenaires')
  revalidatePath('/')
}

// ────────────────────────────────────────────
// Éditeurs
// ────────────────────────────────────────────

export async function createEditeur(formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const nom = formData.get('nom') as string
  const slug = await generateUniqueEditeurSlug(nom)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('editeurs').insert({
    id: randomUUID(),
    nom,
    slug,
    nom_commercial: (formData.get('nom_commercial') as string) || null,
    description: (formData.get('description') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    logo_titre: (formData.get('logo_titre') as string) || null,
    website: (formData.get('website') as string) || null,
    contact_ville: (formData.get('contact_ville') as string) || null,
    contact_pays: (formData.get('contact_pays') as string) || null,
    nb_employes: formData.get('nb_employes') ? Number(formData.get('nb_employes')) : null,
    siret: (formData.get('siret') as string) || null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
    affiche_sur_index: formData.get('affiche_sur_index') === 'on',
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/editeurs')
  const fromClaim = (formData.get('fromClaim') as string) || ''
  if (fromClaim) {
    redirect(`/admin/editeurs?tab=demandes&approveClaim=${encodeURIComponent(fromClaim)}&withEditeur=${encodeURIComponent(data.id)}`)
  }
  redirect(`/admin/editeurs/${data.id}/modifier`)
}

export async function updateEditeur(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('editeurs').update({
    nom: formData.get('nom') as string,
    nom_commercial: (formData.get('nom_commercial') as string) || null,
    description: (formData.get('description') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    logo_titre: (formData.get('logo_titre') as string) || null,
    website: (formData.get('website') as string) || null,
    contact_ville: (formData.get('contact_ville') as string) || null,
    contact_pays: (formData.get('contact_pays') as string) || null,
    nb_employes: formData.get('nb_employes') ? Number(formData.get('nb_employes')) : null,
    siret: (formData.get('siret') as string) || null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
    affiche_sur_index: formData.get('affiche_sur_index') === 'on',
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/editeurs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ed } = await (supabase as any).from('editeurs').select('slug').eq('id', id).single()
  if (ed?.slug) revalidatePath(`/editeur/${ed.slug}`)
  redirect('/admin/editeurs')
}

export async function deleteEditeur(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('editeurs').delete().eq('id', id)
  revalidatePath('/admin/editeurs')
}

/**
 * Lie une solution sans éditeur à un éditeur depuis la page admin de l'éditeur.
 */
export async function attachSolutionToEditeur(solutionId: string, editeurId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('solutions').update({ id_editeur: editeurId }).eq('id', solutionId)
  revalidatePath(`/admin/editeurs/${editeurId}/modifier`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ed } = await (supabase as any).from('editeurs').select('slug').eq('id', editeurId).single()
  if (ed?.slug) revalidatePath(`/editeur/${ed.slug}`)
}

/**
 * Détache une solution de son éditeur (réinitialise id_editeur à NULL).
 */
export async function detachSolutionFromEditeur(solutionId: string, editeurId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('solutions').update({ id_editeur: null }).eq('id', solutionId)
  revalidatePath(`/admin/editeurs/${editeurId}/modifier`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ed } = await (supabase as any).from('editeurs').select('slug').eq('id', editeurId).single()
  if (ed?.slug) revalidatePath(`/editeur/${ed.slug}`)
}

// ────────────────────────────────────────────
// Editeur claims — validation des demandes
// ────────────────────────────────────────────

export async function approuverEditeurClaim(claimId: string, editeurId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claim, error: claimError } = await (supabase as any)
    .from('editeur_claims')
    .select('user_id, solution_id')
    .eq('id', claimId)
    .single()

  if (claimError || !claim) throw new Error('Demande introuvable')

  // users.editeur_id est la source de vérité (N users peuvent partager le même éditeur)
  await supabase
    .from('users')
    .update({ editeur_id: editeurId, role: 'editeur' })
    .eq('id', claim.user_id)

  // Si la demande portait sur une solution (sans éditeur), la rattacher à l'éditeur validé —
  // sinon la solution revendiquée n'apparaîtrait jamais dans l'espace éditeur du user
  if (claim.solution_id) {
    await supabase
      .from('solutions')
      .update({ id_editeur: editeurId })
      .eq('id', claim.solution_id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('editeur_claims')
    .update({ statut: 'approuve' })
    .eq('id', claimId)

  revalidatePath('/admin/editeurs')
  revalidatePath('/admin/utilisateurs')
  revalidatePath('/mon-compte/mon-espace-editeur')
  revalidatePath('/mon-compte/profil')
}

export async function rejeterEditeurClaim(claimId: string, noteAdmin?: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('editeur_claims')
    .update({ statut: 'rejete', note_admin: noteAdmin || null })
    .eq('id', claimId)

  revalidatePath('/admin/editeurs')
}

// ────────────────────────────────────────────
// Tags — gestion catégorie (CRUD global)
// ────────────────────────────────────────────

export async function createFonctionnalite(categorieId: string | null, libelle: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('tags')
    .insert({ id: randomUUID(), id_categorie: categorieId, libelle })
    .select('id, libelle, ordre')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/solutions', 'layout')
  return {
    tag: {
      id: data.id as string,
      libelle: data.libelle as string | null,
      ordre: data.ordre as number | null,
      parent_id: null as string | null,
    },
  }
}

export async function deleteFonctionnalite(tagId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('solutions_tags').delete().eq('id_tag', tagId)
  await supabase.from('tags').delete().eq('id', tagId)
  revalidatePath('/solutions', 'layout')
}

export async function reorderFonctionnalites(orderedIds: string[]) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('tags').update({ ordre: index }).eq('id', id)
    )
  )
  revalidatePath('/solutions', 'layout')
}

export async function createSeparateur(categorieId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tags')
    .insert({ id: randomUUID(), id_categorie: categorieId, libelle: 'Nouveau groupe', is_separator: true })
    .select('id, libelle, ordre')
    .single()
  if (error) return { error: error.message as string }
  revalidatePath('/solutions', 'layout')
  return {
    tag: {
      id: data.id as string,
      libelle: data.libelle as string | null,
      ordre: data.ordre as number | null,
      parent_ids: [] as string[],
      is_separator: true,
    },
  }
}

export async function renameFonctionnalite(tagId: string, libelle: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('tags').update({ libelle }).eq('id', tagId)
  revalidatePath('/solutions', 'layout')
}

export async function updateTagParents(tagId: string, parentIds: string[]) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // parent_ids sera dans le type après migration + regen — cast nécessaire pour l'instant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('tags').update({ parent_ids: parentIds }).eq('id', tagId)
  revalidatePath('/solutions', 'layout')
}

// ────────────────────────────────────────────
// Tags — association solution (par solution)
// ────────────────────────────────────────────

/** Helper : remonte les IDs de tous les ancêtres d'un tag (BFS sur parent_ids[]) */
async function getAncestorTagIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tagId: string
): Promise<string[]> {
  const ancestors = new Set<string>()
  const queue = [tagId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('tags').select('parent_ids').eq('id', currentId).maybeSingle()
    const parentIds = (data?.parent_ids ?? []) as string[]
    for (const pid of parentIds) {
      if (!visited.has(pid)) {
        ancestors.add(pid)
        queue.push(pid)
      }
    }
  }
  return Array.from(ancestors)
}

/**
 * Active/désactive l'association d'un tag avec une solution.
 * Quand on active, les ancêtres (parents) sont également auto-associés.
 */
export async function toggleTagAssociation(solutionId: string, tagId: string, enabled: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  if (enabled) {
    const { data: existing } = await supabase
      .from('solutions_tags')
      .select('id')
      .eq('id_solution', solutionId)
      .eq('id_tag', tagId)
      .maybeSingle()

    if (!existing) {
      await supabase.from('solutions_tags').insert({
        id_solution: solutionId,
        id_tag: tagId,
        is_tag_principal: false,
      })
    }

    // Auto-associer les ancêtres (ex: cocher V2 coche aussi V1)
    const ancestors = await getAncestorTagIds(supabase, tagId)
    for (const ancestorId of ancestors) {
      const { data: existingAncestor } = await supabase
        .from('solutions_tags')
        .select('id')
        .eq('id_solution', solutionId)
        .eq('id_tag', ancestorId)
        .maybeSingle()
      if (!existingAncestor) {
        await supabase.from('solutions_tags').insert({
          id_solution: solutionId,
          id_tag: ancestorId,
          is_tag_principal: false,
        })
      }
    }
  } else {
    await supabase.from('solutions_tags')
      .delete()
      .eq('id_solution', solutionId)
      .eq('id_tag', tagId)
  }

  revalidatePath('/solutions', 'layout')
}

/**
 * Active/désactive le statut "principale" d'un tag pour une solution.
 * Le tag doit déjà être associé ; si ce n'est pas le cas et principale=true, on l'associe.
 */
export async function toggleTagPrincipale(solutionId: string, tagId: string, principale: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from('solutions_tags')
    .select('id')
    .eq('id_solution', solutionId)
    .eq('id_tag', tagId)
    .maybeSingle()

  if (existing) {
    await supabase.from('solutions_tags')
      .update({ is_tag_principal: principale })
      .eq('id', existing.id)
  } else if (principale) {
    await supabase.from('solutions_tags').insert({
      id_solution: solutionId,
      id_tag: tagId,
      is_tag_principal: true,
    })
  }

  revalidatePath('/solutions', 'layout')
}

export async function reorderPartenaires(orderedIds: string[]) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('partenaires').update({ position: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/partenaires')
  revalidatePath('/')
}

export async function updateSiteConfig(cle: string, valeur: string) {
  await assertAdmin()
  const supabase: AnySupabase = createServiceRoleClient()
  await supabase
    .from('site_config')
    .upsert({ cle, valeur }, { onConflict: 'cle' })
  revalidatePath('/')
}

// ────────────────────────────────────────────
// Blog — Catégories
// ────────────────────────────────────────────

export async function createArticleCategorie(nom: string, slug: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles_categories')
    .insert({ id: randomUUID(), nom, slug })
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
}

export async function updateArticleCategorie(id: string, nom: string, slug: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles_categories')
    .update({ nom, slug })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
}

export async function deleteArticleCategorie(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles_categories')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
}

// ────────────────────────────────────────────
// Blog — Articles
// ────────────────────────────────────────────


function extractArticleFromFormData(formData: FormData) {
  const titre = formData.get('titre') as string
  const slug = (formData.get('slug') as string) || slugify(titre)
  const statut = (formData.get('statut') as string) || 'brouillon'
  const scheduledAtRaw = (formData.get('scheduled_at') as string) || null
  const datePublication = statut === 'publié' ? new Date().toISOString() : null
  const scheduledAt = (statut === 'brouillon' && scheduledAtRaw)
    ? new Date(scheduledAtRaw).toISOString()
    : null
  return {
    titre,
    slug,
    extrait: (formData.get('extrait') as string) || null,
    contenu: (formData.get('contenu') as string) || null,
    image_couverture: (formData.get('image_couverture') as string) || null,
    meta_description: (formData.get('meta_description') as string) || null,
    id_categorie: (formData.get('id_categorie') as string) || null,
    statut,
    date_publication: datePublication,
    scheduled_at: scheduledAt,
  }
}

export async function createArticle(formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const data = extractArticleFromFormData(formData)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('articles')
    .insert({ id: randomUUID(), ...data })
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}

export async function updateArticle(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const data = extractArticleFromFormData(formData)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('articles')
    .update(data)
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}

export async function deleteArticle(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
}

export async function updateArticleImageCouverture(id: string, imageUrl: string | null) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles')
    .update({ image_couverture: imageUrl })
    .eq('id', id)
  if (error) return { error: error.message }
}

export async function publishArticle(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('articles')
    .update({ statut: 'publié', date_publication: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  return { success: true }
}

// ────────────────────────────────────────────
// Vidéos / Stories & Tutos
// ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVideoFromFormData(formData: FormData): Record<string, any> {
  return {
    titre: (formData.get('titre') as string) || null,
    url: (formData.get('url') as string) || null,
    vignette: (formData.get('vignette') as string) || null,
    description: (formData.get('description') as string) || null,
    theme: (formData.get('theme') as string) || null,
    rubrique_id: (formData.get('rubrique_id') as string) || null,
    type: (formData.get('type') as string) || null,
    ordre: formData.get('ordre') ? parseInt(formData.get('ordre') as string, 10) : null,
    is_videos_principales: formData.get('is_videos_principales') === 'true',
    statut: (formData.get('statut') as string) || 'publie',
  }
}

export async function toggleVideoStatut(id: string, statut: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('videos').update({ statut }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
}

export async function reorderVideosAndRubriques(
  videoUpdates: { id: string; ordre: number; rubrique_id: string | null }[],
  rubriqueUpdates: { id: string; ordre: number }[]
) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await Promise.all([
    ...videoUpdates.map(({ id, ordre, rubrique_id }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('videos').update({ ordre, rubrique_id }).eq('id', id)
    ),
    ...rubriqueUpdates.map(({ id, ordre }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('video_rubriques').update({ ordre }).eq('id', id)
    ),
  ])
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
}

export async function createVideoRubrique(nom: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: last } = await (supabase as any).from('video_rubriques').select('ordre').order('ordre', { ascending: false }).limit(1).single()
  const nextOrdre = ((last?.ordre as number) ?? -1) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('video_rubriques').insert({ id: randomUUID(), nom, ordre: nextOrdre })
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
}

export async function deleteVideoRubrique(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // Détacher les vidéos avant de supprimer (évite les erreurs de FK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('videos').update({ rubrique_id: null }).eq('rubrique_id', id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('video_rubriques').delete().eq('id', id)
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
}

export async function setHomepageVideos(ids: string[]) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()
  const limited = ids.slice(0, 4)

  // Retirer le pin de toutes les vidéos (filtre requis par Supabase JS v2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('videos').update({ homepage_pinned_at: null, homepage_ordre: null }).not('id', 'is', null)

  if (limited.length > 0) {
    await Promise.all(
      limited.map((id, i) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('videos')
          .update({ homepage_pinned_at: now, homepage_ordre: i + 1 })
          .eq('id', id)
      )
    )
  }

  revalidatePath('/admin/videos')
  revalidatePath('/')
}

/**
 * Synchronise les liaisons video_solutions avec la liste passée en argument.
 * Stratégie : DELETE puis INSERT (simple, fiable, volume négligeable).
 */
async function syncVideoSolutions(videoId: string, solutionIds: string[]) {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('video_solutions').delete().eq('video_id', videoId)
  if (solutionIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('video_solutions').insert(
      solutionIds.map((solution_id) => ({ video_id: videoId, solution_id, ordre: 0 })),
    )
  }
}

/** Extrait la liste des solutions_ids du formData (champ JSON sérialisé). */
function extractSolutionIdsFromFormData(formData: FormData): string[] {
  const raw = formData.get('solution_ids')
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function createVideo(formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const newId = randomUUID()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('videos')
    .insert({ id: newId, ...extractVideoFromFormData(formData) })
  if (error) return { error: error.message }
  await syncVideoSolutions(newId, extractSolutionIdsFromFormData(formData))
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
  redirect('/admin/videos')
}

export async function updateVideo(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('videos')
    .update(extractVideoFromFormData(formData))
    .eq('id', id)
  if (error) return { error: error.message }
  await syncVideoSolutions(id, extractSolutionIdsFromFormData(formData))
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
  // Le revalidate de la fiche solution n'est pas trivial sans connaître les slugs,
  // mais Next.js refetch côté SSR à la prochaine visite — acceptable ici.
  redirect('/admin/videos')
}

/** Liste des solutions actuellement liées à une vidéo. */
export async function getSolutionsLieesAVideo(videoId: string): Promise<string[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_solutions')
    .select('solution_id')
    .eq('video_id', videoId)
  return (data ?? []).map((r: { solution_id: string }) => r.solution_id)
}

/**
 * Pour le panneau "Vidéos liées" dans SolutionForm : liste les vidéos rattachées
 * à cette solution avec un peu de méta pour les afficher dans des chips.
 */
export async function getVideosLieesASolution(solutionId: string): Promise<
  Array<{ id: string; titre: string | null; statut: string; url: string | null }>
> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_solutions')
    .select('ordre, videos(id, titre, statut, url)')
    .eq('solution_id', solutionId)
    .order('ordre', { ascending: true })
  return (data ?? [])
    .map((r: { videos: { id: string; titre: string | null; statut: string; url: string | null } | null }) => r.videos)
    .filter((v: unknown): v is { id: string; titre: string | null; statut: string; url: string | null } => v !== null)
}

/**
 * Pour le sélecteur "ajouter une vidéo existante" dans SolutionForm :
 * liste toutes les vidéos publiées + en_attente avec leur titre.
 * On ne renvoie pas les brouillons/refusées (peu utile à proposer comme rattachement).
 */
export async function getVideosForSolutionSelector(): Promise<
  Array<{ id: string; titre: string | null; statut: string }>
> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('videos')
    .select('id, titre, statut')
    .in('statut', ['publie', 'en_attente'])
    .order('titre')
  return data ?? []
}

/**
 * Ajoute un lien video_solutions (idempotent : si le couple existe déjà, ne fait rien).
 * Utilisé depuis SolutionForm pour rattacher une vidéo à une solution.
 * La nouvelle vidéo est ajoutée en fin de liste (ordre = max(ordre) + 1).
 */
export async function linkVideoToSolution(videoId: string, solutionId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: maxRow } = await (supabase as any)
    .from('video_solutions')
    .select('ordre')
    .eq('solution_id', solutionId)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrdre = ((maxRow?.ordre ?? -1) as number) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('video_solutions')
    .upsert({ video_id: videoId, solution_id: solutionId, ordre: nextOrdre }, { onConflict: 'video_id,solution_id' })
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  revalidatePath('/admin/solutions')
  revalidatePath('/')
  return { ok: true }
}

/** Retire un lien video_solutions. Utilisé depuis SolutionForm. */
export async function unlinkVideoFromSolution(videoId: string, solutionId: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('video_solutions')
    .delete()
    .eq('video_id', videoId)
    .eq('solution_id', solutionId)
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  revalidatePath('/admin/solutions')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Réordonne les vidéos liées à une solution. `orderedVideoIds` doit contenir
 * exactement les vidéos actuellement liées (pas d'ajout/suppression ici).
 * Persiste ordre = 0, 1, 2… dans l'ordre du tableau.
 */
export async function reorderVideosForSolution(
  solutionId: string,
  orderedVideoIds: string[],
) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  for (let i = 0; i < orderedVideoIds.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('video_solutions')
      .update({ ordre: i })
      .eq('solution_id', solutionId)
      .eq('video_id', orderedVideoIds[i])
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/solutions')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteVideo(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('videos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
}

// ────────────────────────────────────────────
// Acronymes
// ────────────────────────────────────────────

export async function createAcronyme(formData: FormData) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase.from('acronymes').insert({
    id: randomUUID(),
    sigle: (formData.get('sigle') as string).trim(),
    definition: (formData.get('definition') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    lien: (formData.get('lien') as string)?.trim() || null,
    disambiguation: (formData.get('disambiguation') as string)?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/acronymes')
  revalidatePath('/glossaire')
}

export async function updateAcronyme(id: string, formData: FormData) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase.from('acronymes').update({
    sigle: (formData.get('sigle') as string).trim(),
    definition: (formData.get('definition') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    lien: (formData.get('lien') as string)?.trim() || null,
    disambiguation: (formData.get('disambiguation') as string)?.trim() || null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/acronymes')
  revalidatePath('/glossaire')
}

export async function deleteAcronyme(id: string) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  await supabase.from('acronymes').delete().eq('id', id)
  revalidatePath('/admin/acronymes')
  revalidatePath('/glossaire')
}

// ────────────────────────────────────────────
// Suggestions d'acronymes (public)
// ────────────────────────────────────────────

export async function suggestAcronyme(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const sigle = (formData.get('sigle') as string)?.trim()
  const definition = (formData.get('definition') as string)?.trim()
  const email = (formData.get('email') as string)?.trim() || null
  if (!sigle || !definition) return { error: 'Sigle et définition requis.' }
  const { error } = await supabase.from('suggestions_acronymes').insert({ sigle, definition, email })
  if (error) return { error: error.message }
  return { success: true }
}

export async function approveSuggestion(id: string, payload: {
  sigle: string
  definition: string
  description: string | null
}) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase.from('acronymes').insert({
    id: randomUUID(),
    sigle: payload.sigle.trim(),
    definition: payload.definition.trim(),
    description: payload.description || null,
    lien: null,
  })
  if (error) return { error: error.message }
  await supabase.from('suggestions_acronymes').delete().eq('id', id)
  revalidatePath('/admin/acronymes')
  revalidatePath('/glossaire')
}

export async function rejectSuggestion(id: string) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  await supabase.from('suggestions_acronymes').delete().eq('id', id)
  revalidatePath('/admin/acronymes')
}

// ────────────────────────────────────────────
// Demandes de référencement éditeur (formulaire public sur /editeurs)
// ────────────────────────────────────────────

export async function suggestEditeurReferencement(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const nomEditeur = (formData.get('nom_editeur') as string)?.trim()
  const nomSolution = (formData.get('nom_solution') as string)?.trim() || null
  const emailContact = (formData.get('email_contact') as string)?.trim()
  const siteWeb = (formData.get('site_web') as string)?.trim() || null
  const message = (formData.get('message') as string)?.trim() || null

  if (!nomEditeur || !emailContact) {
    return { error: 'Le nom de la société et l\'email sont obligatoires.' }
  }
  // Validation email basique
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailContact)) {
    return { error: 'L\'adresse email n\'est pas valide.' }
  }

  const { error } = await supabase.from('editeur_demandes_referencement').insert({
    nom_editeur: nomEditeur,
    nom_solution: nomSolution,
    email_contact: emailContact,
    site_web: siteWeb,
    message,
  })
  if (error) return { error: error.message }

  // Envoi des emails (non-bloquant : si SendGrid plante, on retourne quand même success)
  try {
    const { default: sgMail } = await import('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    const FROM = { email: 'contact@100000medecins.org', name: '100000médecins.org' }

    // Accusé de réception au demandeur
    await sgMail.send({
      to: emailContact,
      from: FROM,
      subject: 'Votre demande de référencement — 100000médecins.org',
      html: `
        <h2>Demande bien reçue</h2>
        <p>Bonjour,</p>
        <p>Nous avons bien reçu votre demande de référencement pour <strong>${nomEditeur}</strong>${
          nomSolution ? ` (logiciel : <strong>${nomSolution}</strong>)` : ''
        }.</p>
        <p>Notre équipe l'examinera dans les meilleurs délais et reviendra vers vous par email.</p>
        <p>Merci de votre intérêt pour 100000médecins.org.</p>
        <hr />
        <p style="color:#888;font-size:12px">Récapitulatif de votre demande :</p>
        <ul style="color:#888;font-size:12px">
          <li><strong>Société :</strong> ${nomEditeur}</li>
          ${nomSolution ? `<li><strong>Logiciel :</strong> ${nomSolution}</li>` : ''}
          ${siteWeb ? `<li><strong>Site :</strong> ${siteWeb}</li>` : ''}
          ${message ? `<li><strong>Message :</strong> ${message.replace(/\n/g, '<br />')}</li>` : ''}
        </ul>
      `,
    })

    // Notification interne
    await sgMail.send({
      to: 'david.azerad@100000medecins.org',
      from: FROM,
      replyTo: emailContact,
      subject: `[Demande référencement] ${nomEditeur}`,
      html: `
        <h2>Nouvelle demande de référencement éditeur</h2>
        <ul>
          <li><strong>Société :</strong> ${nomEditeur}</li>
          ${nomSolution ? `<li><strong>Logiciel concerné :</strong> ${nomSolution}</li>` : ''}
          <li><strong>Email contact :</strong> <a href="mailto:${emailContact}">${emailContact}</a></li>
          ${siteWeb ? `<li><strong>Site web :</strong> <a href="${siteWeb}">${siteWeb}</a></li>` : ''}
        </ul>
        ${message ? `<hr /><p><strong>Message :</strong></p><p>${message.replace(/\n/g, '<br />')}</p>` : ''}
        <hr />
        <p><a href="https://www.100000medecins.org/admin/editeurs/demandes">Voir dans l'admin</a></p>
      `,
    })
  } catch (e) {
    console.error('[suggestEditeurReferencement] email error', e)
    // On ne fait pas échouer la requête : la demande est en base, l'admin la verra de toute façon.
  }

  return { success: true }
}

export async function approveEditeurReferencement(id: string, payload: {
  nom: string
  nom_commercial: string | null
  website: string | null
}) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const slug = await generateUniqueEditeurSlug(payload.nom)
  const newId = randomUUID()
  const { error: insertError } = await supabase.from('editeurs').insert({
    id: newId,
    nom: payload.nom,
    slug,
    nom_commercial: payload.nom_commercial,
    website: payload.website,
    affiche_sur_index: false, // l'admin activera la visibilité après avoir complété la fiche
  })
  if (insertError) return { error: insertError.message }

  await supabase.from('editeur_demandes_referencement').delete().eq('id', id)
  revalidatePath('/admin/editeurs/demandes')
  revalidatePath('/admin', 'layout')
  return { success: true, editeurId: newId }
}

export async function rejectEditeurReferencement(id: string) {
  await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  await supabase.from('editeur_demandes_referencement').delete().eq('id', id)
  revalidatePath('/admin/editeurs/demandes')
  revalidatePath('/admin', 'layout')
}

// ────────────────────────────────────────────
// Paramètres globaux (app_settings)
// ────────────────────────────────────────────

export async function setDisplayPrixFront(value: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: 'display_prix_front', value: value as never },
      { onConflict: 'key' }
    )
  if (error) return { error: error.message }
  revalidatePath('/admin/parametres')
  revalidatePath('/', 'layout')
}

export async function setDisplayContactsCommerciaux(value: boolean) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: 'display_contacts_commerciaux', value: value as never },
      { onConflict: 'key' }
    )
  if (error) return { error: error.message }
  revalidatePath('/admin/parametres')
  revalidatePath('/solutions', 'layout')
}
