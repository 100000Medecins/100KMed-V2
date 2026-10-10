'use server'

/**
 * Panneau « Publier sur les réseaux » (articles et vidéos) : posts enregistrés en base,
 * partagés entre l'admin et la community manager. Chaque action renvoie la liste à jour
 * des posts du contenu concerné.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { assertAdminOuContenu, roleAdmin } from '@/lib/auth/admin-guard'
import { genererPostsSociaux } from '@/lib/ai/posts-sociaux'
import { listerPosts, programmationActive, sourceDuPost, transmettre } from '@/lib/reseaux/envoi'
import { fichierDuPost, listerFichiers } from '@/lib/reseaux/fichiers'
import { lienEtImageVideo } from '@/lib/reseaux/liens'
import { RESEAUX, formatDuReseau, type MediaPost, type PostReseau, type Reseau, type SourcePost } from '@/lib/reseaux/types'

type Resultat = { posts: PostReseau[]; error?: string }

// Seuls les brouillons et les envois en erreur se modifient ou partent.
const MODIFIABLES = ['brouillon', 'erreur']

async function postModifiable(id: string): Promise<PostReseau | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('posts_reseaux').select('*').eq('id', id).single()
  return data && MODIFIABLES.includes(data.statut) ? data : null
}

async function listeDuPost(id: string, error?: string): Promise<Resultat> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('posts_reseaux').select('*').eq('id', id).single()
  return { posts: data ? await listerPosts(sourceDuPost(data)) : [], error }
}

/**
 * Rédige les 3 messages et remplace les brouillons existants du contenu (les posts
 * programmés ou envoyés ne sont pas touchés). `creneaux` : heure suggérée par réseau (ISO).
 */
export async function genererBrouillons(
  source: SourcePost & { titre: string; resume?: string | null; lien?: string },
  creneaux: Record<Reseau, string>,
): Promise<Resultat> {
  await assertAdminOuContenu()
  const role = await roleAdmin()

  const resultat = await genererPostsSociaux({ type: source.type, titre: source.titre, extrait: source.resume, url: source.lien })
  if (!resultat.ok) return { posts: await listerPosts(source), error: resultat.error }

  const supabase = createServiceRoleClient()
  const colonne = source.type === 'article' ? 'article_id' : 'video_id'
  await supabase.from('posts_reseaux').delete().eq(colonne, source.id).in('statut', MODIFIABLES)

  // Un fichier vidéo déposé est là pour être publié : le post du réseau concerné naît en vidéo.
  const formats = source.type === 'video' ? (await listerFichiers(source.id)).map((f) => f.format) : []
  const { error } = await supabase.from('posts_reseaux').insert(
    RESEAUX.map((reseau) => ({
      [colonne]: source.id,
      reseau,
      texte: resultat.posts[reseau],
      programme_le: creneaux[reseau] ?? null,
      media: formats.includes(formatDuReseau(reseau) ?? '') ? 'video' : 'image',
      cree_par: role,
    })),
  )
  return { posts: await listerPosts(source), error: error?.message }
}

/** Enregistre le texte, le créneau et/ou le média d'un brouillon (sans effet sur un post programmé ou envoyé). */
export async function enregistrerPost(id: string, champs: { texte?: string; programmeLe?: string | null; media?: MediaPost }): Promise<Resultat> {
  await assertAdminOuContenu()
  const supabase = createServiceRoleClient()
  if (champs.media === 'video') {
    const post = await postModifiable(id)
    if (!post || !(await fichierDuPost(supabase, post))) return listeDuPost(id, "Déposez d'abord le fichier vidéo de ce réseau.")
  }
  await supabase
    .from('posts_reseaux')
    .update({
      ...(champs.texte !== undefined ? { texte: champs.texte } : {}),
      ...(champs.programmeLe !== undefined ? { programme_le: champs.programmeLe } : {}),
      ...(champs.media !== undefined ? { media: champs.media === 'video' ? 'video' : 'image' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('statut', MODIFIABLES)
  return listeDuPost(id)
}

/** Envoi immédiat à Make, avec le texte affiché à l'écran. */
export async function envoyerMaintenant(id: string, texte: string): Promise<Resultat> {
  await assertAdminOuContenu()
  const supabase = createServiceRoleClient()
  // Passage en « en_cours » conditionné au statut : un double clic n'envoie qu'une fois.
  const { data: post } = await supabase
    .from('posts_reseaux')
    .update({ texte, statut: 'en_cours', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('statut', MODIFIABLES)
    .select()
    .single()
  if (!post) return listeDuPost(id, "Ce post n'est plus modifiable (déjà programmé ou envoyé).")

  await transmettre(supabase, post)
  return listeDuPost(id)
}

/** Programme l'envoi : la tâche planifiée le transmettra à Make à l'heure dite. */
export async function programmerPost(id: string, texte: string, programmeLe: string): Promise<Resultat> {
  await assertAdminOuContenu()
  // Sans la tâche planifiée, un post programmé ne partirait jamais.
  if (!programmationActive()) return listeDuPost(id, "La programmation n'est pas encore activée : utilisez « Envoyer maintenant ».")
  const date = new Date(programmeLe)
  if (Number.isNaN(date.getTime())) return listeDuPost(id, 'Date de publication invalide.')
  if (date.getTime() < Date.now() + 60_000) return listeDuPost(id, 'La date de publication est passée : choisissez une heure à venir, ou « Envoyer maintenant ».')

  const post = await postModifiable(id)
  if (!post) return listeDuPost(id, "Ce post n'est plus modifiable (déjà programmé ou envoyé).")
  const supabase = createServiceRoleClient()
  if (post.media === 'video') {
    if (!(await fichierDuPost(supabase, post))) return listeDuPost(id, 'Le fichier vidéo de ce réseau manque : déposez-le, ou repassez le post en « image ».')
  } else if (post.reseau === 'instagram' && !(await imageDisponible(post))) {
    return listeDuPost(id, 'Instagram exige une image.')
  }

  await supabase
    .from('posts_reseaux')
    .update({ texte, programme_le: date.toISOString(), statut: 'programme', erreur: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('statut', MODIFIABLES)
  return listeDuPost(id)
}

/** Repasse un post programmé en brouillon (pour le modifier ou l'abandonner). */
export async function annulerProgrammation(id: string): Promise<Resultat> {
  await assertAdminOuContenu()
  const supabase = createServiceRoleClient()
  await supabase
    .from('posts_reseaux')
    .update({ statut: 'brouillon', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('statut', 'programme')
  return listeDuPost(id)
}

/** Supprime un post pas encore parti (les envois restent dans l'historique). */
export async function supprimerPost(id: string): Promise<Resultat> {
  await assertAdminOuContenu()
  const supabase = createServiceRoleClient()
  const { data: post } = await supabase.from('posts_reseaux').select('*').eq('id', id).single()
  if (!post) return { posts: [] }
  await supabase.from('posts_reseaux').delete().eq('id', id).in('statut', [...MODIFIABLES, 'programme'])
  return { posts: await listerPosts(sourceDuPost(post)) }
}

async function imageDisponible(post: PostReseau): Promise<boolean> {
  if (post.image_url) return true
  const supabase = createServiceRoleClient()
  if (post.article_id) {
    const { data } = await supabase.from('articles').select('image_couverture').eq('id', post.article_id).single()
    return !!data?.image_couverture
  }
  const { data } = await supabase.from('videos').select('url, vignette').eq('id', post.video_id!).single()
  return !!lienEtImageVideo(data?.url, data?.vignette).image
}
