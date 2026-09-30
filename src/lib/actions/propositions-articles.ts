'use server'

/**
 * Actions d'arbitrage des propositions de sujets d'articles (admin blog).
 *
 * ⚠️ Fichier `'use server'` : tous les exports DOIVENT être async. Les helpers
 * synchrones (slugify…) restent privés — les exporter ferait échouer le build
 * Turbopack (« Server Actions must be async functions »).
 */

import { cookies } from 'next/headers'
import { createHmac, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { creerLotPropositions } from '@/lib/propositions-articles'
import { genererArticle, type LongueurArticle } from '@/lib/ai/article'
import type { SourceActu } from '@/lib/ai/propositions-sujets'

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
  if (token !== expected) throw new Error('Non autorisé')
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * `articles.slug` porte une contrainte UNIQUE : un titre proche d'un article
 * existant ferait échouer l'insertion avec une erreur Postgres illisible.
 * On suffixe donc jusqu'à trouver un slug libre.
 */
async function slugLibre(
  supabase: ReturnType<typeof createServiceRoleClient>,
  base: string
): Promise<string> {
  const racine = base || `article-${Date.now()}`
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .like('slug', `${racine}%`)

  const pris = new Set((data ?? []).map((a) => a.slug))
  if (!pris.has(racine)) return racine

  let n = 2
  while (pris.has(`${racine}-${n}`)) n++
  return `${racine}-${n}`
}

/** Compose le brief envoyé au rédacteur à partir de la proposition. */
function construireBrief(titre: string, angle: string, sources: SourceActu[]): string {
  const bloc = sources.length
    ? `\n\nÉléments d'actualité à prendre en compte :\n${sources.map((s) => `- ${s.titre} (${s.url})`).join('\n')}`
    : ''
  return `${titre}\n\n${angle}${bloc}`
}

/**
 * Regénère le lot de la semaine, avec un cadrage libre optionnel.
 * Les propositions encore en attente sont écartées (conservées en base, mais
 * retirées de la liste) pour que l'admin en affiche trois, pas six.
 */
export async function regenererPropositions(
  cadrage: string | null
): Promise<{ error?: string } | void> {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const resultat = await creerLotPropositions(supabase, {
    cadrage,
    ecarterEnAttente: true,
  })

  if (!resultat.ok) return { error: resultat.error }
  revalidatePath('/admin/blog')
}

/** Retire une proposition de la liste sans la supprimer (mémoire anti-radotage). */
export async function ecarterProposition(id: string): Promise<{ error?: string } | void> {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('propositions_articles')
    .update({ statut: 'ecartee', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/blog')
}

/**
 * Rédige l'article immédiatement et crée le brouillon, puis ouvre l'éditeur.
 * L'autre chemin — « Ouvrir le formulaire » — est un simple lien qui pré-remplit
 * le brief sans rien écrire.
 */
export async function redigerMaintenant(id: string): Promise<{ error?: string } | void> {
  await assertAdmin()
  const supabase = createServiceRoleClient()

  const { data: proposition, error: lectureError } = await supabase
    .from('propositions_articles')
    .select('id, titre, angle, longueur, sources, statut')
    .eq('id', id)
    .maybeSingle()

  if (lectureError) return { error: lectureError.message }
  if (!proposition) return { error: 'Proposition introuvable.' }
  if (proposition.statut === 'developpee') {
    return { error: 'Cette proposition a déjà été développée.' }
  }

  const brief = construireBrief(
    proposition.titre,
    proposition.angle,
    (proposition.sources ?? []) as unknown as SourceActu[]
  )

  const resultat = await genererArticle(brief, proposition.longueur as LongueurArticle)
  if (!resultat.ok) return { error: resultat.error }

  const articleId = randomUUID()
  const slug = await slugLibre(supabase, slugify(resultat.article.titre))

  const { error: insertError } = await supabase.from('articles').insert({
    id: articleId,
    titre: resultat.article.titre,
    slug,
    extrait: resultat.article.chapeau || null,
    contenu: resultat.article.contenu_html || null,
    meta_description: resultat.article.meta_description || null,
    statut: 'brouillon',
    date_publication: null,
    scheduled_at: null,
  })

  if (insertError) return { error: insertError.message }

  const { error: majError } = await supabase
    .from('propositions_articles')
    .update({
      statut: 'developpee',
      article_id: articleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (majError) {
    // L'article existe : on ne le supprime pas pour autant, on le signale.
    console.error('[propositions-articles] maj statut:', majError.message)
  }

  revalidatePath('/admin/blog')
  redirect(`/admin/blog/${articleId}/modifier`)
}

/**
 * Marque une proposition comme développée après création manuelle de l'article
 * (chemin « Ouvrir le formulaire »). Appelée depuis `createArticle`.
 */
export async function lierPropositionAArticle(
  propositionId: string,
  articleId: string
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('propositions_articles')
    .update({
      statut: 'developpee',
      article_id: articleId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propositionId)

  if (error) console.error('[propositions-articles] liaison article:', error.message)
}
