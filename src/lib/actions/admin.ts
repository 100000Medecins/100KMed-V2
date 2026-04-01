'use server'

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'

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
  redirect('/admin/solutions')
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

export async function updatePageStatique(id: string, formData: FormData) {
  await assertAdmin()

  const supabase = createServiceRoleClient()

  const updateData = {
    titre: formData.get('titre') as string,
    image_couverture: (formData.get('image_couverture') as string) || null,
    contenu: (formData.get('contenu') as string) || null,
    meta_description: (formData.get('meta_description') as string) || null,
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
