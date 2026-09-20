/**
 * Propositions de sujets d'articles — orchestration et persistance.
 *
 * Point d'entrée unique partagé par :
 *   - le cron hebdomadaire `/api/cron/proposer-sujets-articles`
 *   - l'action « Regénérer » de l'admin blog (avec cadrage libre)
 *
 * Le moteur (recherche + modèle) vit dans `src/lib/ai/propositions-sujets.ts`.
 * Ici on ne fait que rassembler le contexte éditorial, appeler ce moteur et
 * écrire le lot en base.
 *
 * ⚠️ Pas de `'use server'` : ce module exporte des types et des constantes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import {
  genererPropositions,
  lundiDeLaSemaine,
  type PropositionGeneree,
  type SourceActu,
} from '@/lib/ai/propositions-sujets'
import type { LongueurArticle } from '@/lib/ai/article'

export { lundiDeLaSemaine }
export type { SourceActu }

type ServiceClient = SupabaseClient<Database>

export type StatutProposition = 'proposee' | 'ecartee' | 'developpee'

export interface PropositionArticle {
  id: string
  lot_id: string
  semaine: string
  titre: string
  angle: string
  type: 'actu' | 'dossier'
  longueur: LongueurArticle
  sources: SourceActu[]
  statut: StatutProposition
  cadrage: string | null
  article_id: string | null
  created_at: string
}

/** Nombre de lots passés dont on rappelle les titres au modèle (anti-radotage). */
const HISTORIQUE_TITRES = 30

/** Articles publiés rappelés au modèle — les plus récents suffisent. */
const HISTORIQUE_ARTICLES = 40

/**
 * Titres déjà traités ou déjà proposés, pour que le modèle ne tourne pas en rond.
 * C'est précisément ce que la conservation des lots écartés rend possible.
 */
async function chargerContexteEditorial(supabase: ServiceClient): Promise<{
  titresPublies: string[]
  titresDejaProposes: string[]
}> {
  const [articles, propositions] = await Promise.all([
    supabase
      .from('articles')
      .select('titre')
      .order('created_at', { ascending: false })
      .limit(HISTORIQUE_ARTICLES),
    supabase
      .from('propositions_articles')
      .select('titre')
      .order('created_at', { ascending: false })
      .limit(HISTORIQUE_TITRES),
  ])

  return {
    titresPublies: (articles.data ?? []).map((a) => a.titre).filter(Boolean),
    titresDejaProposes: (propositions.data ?? []).map((p) => p.titre).filter(Boolean),
  }
}

export type ResultatLot =
  | { ok: true; lotId: string; propositions: PropositionArticle[] }
  | { ok: false; error: string }

export interface OptionsLot {
  /** Cadrage libre saisi dans l'admin. `null` pour un lot automatique. */
  cadrage?: string | null
  /** Semaine de rattachement (YYYY-MM-DD, un lundi). Défaut : semaine courante. */
  semaine?: string
  /**
   * Écarte les propositions encore en attente de la même semaine avant d'écrire
   * le nouveau lot. Utilisé par « Regénérer » : sans ça, l'admin empilerait
   * six sujets au lieu d'en remplacer trois. Le cron, lui, ne l'utilise pas.
   */
  ecarterEnAttente?: boolean
}

export async function creerLotPropositions(
  supabase: ServiceClient,
  options: OptionsLot = {}
): Promise<ResultatLot> {
  const semaine = options.semaine ?? lundiDeLaSemaine()
  const cadrage = options.cadrage?.trim() || null

  const contexte = await chargerContexteEditorial(supabase)

  const resultat = await genererPropositions({
    cadrage,
    titresPublies: contexte.titresPublies,
    titresDejaProposes: contexte.titresDejaProposes,
  })

  if (!resultat.ok) {
    // La réponse brute ne remonte pas jusqu'à l'admin (message court en UI) :
    // sans cette trace, un échec de parsing n'est diagnosticable qu'en rejouant
    // l'appel à la main. C'est exactement ce qui est arrivé au premier essai.
    if (resultat.raw) {
      console.error('[propositions-articles] réponse non parsable:', resultat.raw.slice(0, 1000))
    }
    return { ok: false, error: resultat.error }
  }

  // Écarter l'ancien lot AVANT d'insérer le nouveau : on conserve l'historique
  // (rien n'est supprimé), mais l'admin n'affiche que ce qui est encore en attente.
  if (options.ecarterEnAttente) {
    const { error } = await supabase
      .from('propositions_articles')
      .update({ statut: 'ecartee', updated_at: new Date().toISOString() })
      .eq('semaine', semaine)
      .eq('statut', 'proposee')
    if (error) return { ok: false, error: error.message }
  }

  const lotId = crypto.randomUUID()

  const lignes = resultat.propositions.map((p: PropositionGeneree) => ({
    lot_id: lotId,
    semaine,
    titre: p.titre,
    angle: p.angle,
    type: p.type,
    longueur: p.longueur,
    // Conversion au type JSONB généré : `Json` exige une signature d'index que
    // `SourceActu` n'a pas. On garde le type métier précis et on ne convertit
    // qu'ici, au passage en base.
    sources: p.sources as unknown as Json,
    cadrage,
  }))

  const { data, error } = await supabase
    .from('propositions_articles')
    .insert(lignes)
    .select('*')

  if (error) return { ok: false, error: error.message }

  return { ok: true, lotId, propositions: (data ?? []) as unknown as PropositionArticle[] }
}

/** Propositions encore en attente d'arbitrage, les plus récentes d'abord. */
export async function getPropositionsEnAttente(
  supabase: ServiceClient
): Promise<PropositionArticle[]> {
  const { data, error } = await supabase
    .from('propositions_articles')
    .select('*')
    .eq('statut', 'proposee')
    .order('semaine', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[propositions-articles] lecture:', error.message)
    return []
  }
  return (data ?? []) as unknown as PropositionArticle[]
}
