'use server'

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceRoleClient, createServiceRoleClientUntyped } from '@/lib/supabase/server'

// ────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string

  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Mot de passe incorrect' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_token', generateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

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
    throw new Error('Non autorisé')
  }
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
    version: (formData.get('version') as string) || null,
    date_publication: (formData.get('date_publication') as string) || null,
    lancement: (formData.get('date_lancement') as string) || null,
    date_debut: (formData.get('date_debut') as string) || null,
    date_fin: (formData.get('date_fin') as string) || null,
    date_maj: (formData.get('date_maj') as string) || null,
    evaluation_redac_note: formData.get('note_redac_base5') ? Number(formData.get('note_redac_base5')) : null,
    evaluation_redac_avis: (formData.get('evaluation_redac_avis') as string) || null,
    evaluation_redac_points_forts: (formData.get('evaluation_redac_points_forts') as string)
      ? (formData.get('evaluation_redac_points_forts') as string).split('\n').filter(Boolean)
      : null,
    evaluation_redac_points_faibles: (formData.get('evaluation_redac_points_faibles') as string)
      ? (formData.get('evaluation_redac_points_faibles') as string).split('\n').filter(Boolean)
      : null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
    meta: (() => {
      const t = (formData.get('meta_title') as string) || null
      const d = (formData.get('meta_description') as string) || null
      const c = (formData.get('meta_canonical') as string) || null
      return (t || d || c) ? { title: t, description: d, canonical: c } : null
    })(),
    segments: formData.get('segments') ? (() => { try { return JSON.parse(formData.get('segments') as string) } catch { return null } })() : null,
    nb_utilisateurs: formData.get('nb_utilisateurs') ? (() => { try { return JSON.parse(formData.get('nb_utilisateurs') as string) } catch { return null } })() : null,
    duree_engagement: formData.get('duree_engagement') ? (() => { try { return JSON.parse(formData.get('duree_engagement') as string) } catch { return null } })() : null,
  }
}

async function syncGalerie(supabase: ReturnType<typeof createServiceRoleClient>, solutionId: string, galerieJson: string) {
  let images: Array<{ url: string; titre: string; ordre: number }> = []
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
  const { data, error } = await supabase.from('editeurs').insert({
    id: randomUUID(),
    nom: formData.get('nom') as string,
    nom_commercial: (formData.get('nom_commercial') as string) || null,
    description: (formData.get('description') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    logo_titre: (formData.get('logo_titre') as string) || null,
    website: (formData.get('website') as string) || null,
    contact_email: (formData.get('contact_email') as string) || null,
    contact_telephone: (formData.get('contact_telephone') as string) || null,
    contact_adresse: (formData.get('contact_adresse') as string) || null,
    contact_cp: (formData.get('contact_cp') as string) || null,
    contact_ville: (formData.get('contact_ville') as string) || null,
    contact_pays: (formData.get('contact_pays') as string) || null,
    nb_employes: formData.get('nb_employes') ? Number(formData.get('nb_employes')) : null,
    siret: (formData.get('siret') as string) || null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/editeurs')
  redirect(`/admin/editeurs/${data.id}/modifier`)
}

export async function updateEditeur(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('editeurs').update({
    nom: formData.get('nom') as string,
    nom_commercial: (formData.get('nom_commercial') as string) || null,
    description: (formData.get('description') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    logo_titre: (formData.get('logo_titre') as string) || null,
    website: (formData.get('website') as string) || null,
    contact_email: (formData.get('contact_email') as string) || null,
    contact_telephone: (formData.get('contact_telephone') as string) || null,
    contact_adresse: (formData.get('contact_adresse') as string) || null,
    contact_cp: (formData.get('contact_cp') as string) || null,
    contact_ville: (formData.get('contact_ville') as string) || null,
    contact_pays: (formData.get('contact_pays') as string) || null,
    nb_employes: formData.get('nb_employes') ? Number(formData.get('nb_employes')) : null,
    siret: (formData.get('siret') as string) || null,
    mot_editeur: (formData.get('mot_editeur') as string) || null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/editeurs')
  revalidatePath(`/editeur/${id}`)
  redirect('/admin/editeurs')
}

export async function deleteEditeur(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClient()
  await supabase.from('editeurs').delete().eq('id', id)
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
  const supabase = createServiceRoleClientUntyped()
  const { error } = await supabase
    .from('articles_categories')
    .insert({ id: randomUUID(), nom, slug })
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
}

export async function updateArticleCategorie(id: string, nom: string, slug: string) {
  await assertAdmin()
  const supabase = createServiceRoleClientUntyped()
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
  const supabase = createServiceRoleClientUntyped()
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
  const datePublication = statut === 'publié' ? new Date().toISOString() : null
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
  }
}

export async function createArticle(formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClientUntyped()
  const data = extractArticleFromFormData(formData)
  const { error } = await supabase
    .from('articles')
    .insert({ id: randomUUID(), ...data })
  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}

export async function updateArticle(id: string, formData: FormData) {
  await assertAdmin()
  const supabase = createServiceRoleClientUntyped()
  const data = extractArticleFromFormData(formData)
  const { error } = await supabase
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
  const supabase = createServiceRoleClientUntyped()
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
  const supabase = createServiceRoleClientUntyped()
  const { error } = await supabase
    .from('articles')
    .update({ image_couverture: imageUrl })
    .eq('id', id)
  if (error) return { error: error.message }
}

export async function publishArticle(id: string) {
  await assertAdmin()
  const supabase = createServiceRoleClientUntyped()
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
