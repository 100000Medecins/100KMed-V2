'use server'

/**
 * Enregistrement des visuels du studio Instagram. Le navigateur dessine le JPEG et le dépose
 * directement dans le bucket public par une adresse signée délivrée ici (une action serveur ne
 * reçoit qu'1 Mo par défaut) ; le serveur relit ensuite le fichier déposé avant d'écrire la ligne.
 */

import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { assertAdminOuContenu } from '@/lib/auth/admin-guard'
import { FORMATS, type FormatId } from '@/lib/reseaux/gabarit'
import { BUCKET_VISUELS, POIDS_MAX_VISUEL, estFormatVisuel, nettoyerReglages, type VisuelEnregistre, type VisuelsArticle } from '@/lib/reseaux/visuels'
import { lireVisuelsDe } from '@/lib/reseaux/visuels-serveur'
import { genererAccroches } from '@/lib/ai/accroche-visuel'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Accroches courtes proposées par Claude pour le visuel (titre trop long), de la meilleure à la moins bonne. */
export async function proposerAccroches(articleId: string): Promise<{ accroches: string[] } | { error: string }> {
  await assertAdminOuContenu()
  if (!UUID.test(articleId)) return { error: 'Article introuvable.' }
  const supabase = createServiceRoleClient()
  const { data: article } = await supabase.from('articles').select('titre, extrait, contenu').eq('id', articleId).maybeSingle()
  if (!article) return { error: 'Article introuvable.' }
  const r = await genererAccroches({ titre: article.titre ?? '', chapeau: article.extrait, contenuHtml: article.contenu })
  return r.ok ? { accroches: r.accroches } : { error: r.error }
}

/** Visuels enregistrés de l'article (pour rouvrir le studio sur ses réglages). */
export async function lireVisuelsArticle(articleId: string): Promise<VisuelsArticle> {
  await assertAdminOuContenu()
  if (!UUID.test(articleId)) return {}
  return lireVisuelsDe(createServiceRoleClient(), articleId)
}

/** Délivre une adresse de dépôt signée (un seul fichier) pour un nom neuf choisi ici. */
export async function preparerDepotVisuel(articleId: string, format: FormatId): Promise<{ adresse: string; chemin: string } | { error: string }> {
  await assertAdminOuContenu()
  if (!estFormatVisuel(format)) return { error: 'Format inconnu.' }
  if (!UUID.test(articleId)) return { error: 'Article introuvable.' }

  const supabase = createServiceRoleClient()
  const { data: article } = await supabase.from('articles').select('id').eq('id', articleId).maybeSingle()
  if (!article) return { error: "Article introuvable : enregistrez-le d'abord." }

  // Nom neuf à chaque enregistrement : l'adresse publique d'un visuel ne change jamais de contenu.
  const chemin = `${article.id}/${format}-${Date.now()}.jpg`
  const { data, error } = await supabase.storage.from(BUCKET_VISUELS).createSignedUploadUrl(chemin)
  return data ? { adresse: data.signedUrl, chemin } : { error: `Dépôt impossible : ${error.message}` }
}

/**
 * Vérifie le fichier déposé (JPEG aux dimensions exactes du format, 8 Mo au plus) et enregistre
 * le visuel ; un fichier refusé est effacé. Les anciens fichiers du format partent ensuite.
 */
export async function confirmerDepotVisuel(
  articleId: string,
  format: FormatId,
  chemin: string,
  reglagesBruts: unknown,
): Promise<{ visuel: VisuelEnregistre } | { error: string }> {
  await assertAdminOuContenu()
  const prefixe = `${articleId}/${format}-`
  if (!estFormatVisuel(format) || !UUID.test(articleId) || !chemin.startsWith(prefixe) || !/^\d+\.jpg$/.test(chemin.slice(prefixe.length))) {
    return { error: 'Dépôt non reconnu.' }
  }

  const supabase = createServiceRoleClient()
  const stockage = supabase.storage.from(BUCKET_VISUELS)
  const refuser = async (message: string) => {
    await stockage.remove([chemin])
    return { error: message }
  }

  const reglages = nettoyerReglages(reglagesBruts)
  if (!reglages) return refuser('Réglages illisibles : rechargez la page et recommencez.')

  const { data: fichier } = await stockage.download(chemin)
  if (!fichier) return { error: "Le fichier n'est pas arrivé : recommencez l'enregistrement." }
  if (fichier.size > POIDS_MAX_VISUEL) return refuser('Visuel trop lourd : 8 Mo au plus.')
  const attendu = FORMATS[format]
  let lu: { format?: string; width?: number; height?: number }
  try {
    lu = await sharp(Buffer.from(await fichier.arrayBuffer())).metadata()
  } catch {
    return refuser("Le fichier déposé n'est pas une image lisible.")
  }
  if (lu.format !== 'jpeg' || lu.width !== attendu.w || lu.height !== attendu.h) {
    return refuser(`Le fichier déposé n'est pas un JPEG de ${attendu.w} × ${attendu.h} px.`)
  }

  const url = stockage.getPublicUrl(chemin).data.publicUrl
  const maintenant = new Date().toISOString()
  const { error } = await supabase
    .from('visuels_reseaux')
    .upsert({ article_id: articleId, format, chemin, url, reglages, updated_at: maintenant }, { onConflict: 'article_id,format' })
  if (error) return refuser(`Enregistrement impossible : ${error.message}`)

  // Version précédente et dépôts interrompus de ce format : effacés (l'autre format n'est pas touché).
  const { data: objets } = await stockage.list(articleId, { limit: 1000 })
  const anciens = (objets ?? [])
    .filter((o) => o.id && o.name.startsWith(`${format}-`))
    .map((o) => `${articleId}/${o.name}`)
    .filter((c) => c !== chemin)
  if (anciens.length) await stockage.remove(anciens)

  return { visuel: { format, url, reglages, enregistreLe: maintenant } }
}
