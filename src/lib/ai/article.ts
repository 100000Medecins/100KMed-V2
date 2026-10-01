/**
 * Moteur de rédaction d'article — source unique du prompt « Dr Azerty ».
 *
 * Extrait de `src/app/api/generer-article/route.ts` pour être partagé entre :
 *   - la route HTTP `/api/generer-article` (bouton « Générer » du formulaire admin)
 *   - l'action serveur « Rédiger maintenant » des propositions de sujets, qui
 *     appelle `genererArticle()` en direct, sans aller-retour HTTP.
 *
 * ⚠️ Ce fichier n'est PAS `'use server'` : il expose des constantes et des types
 * synchrones. Les y déplacer casserait le build (« Server Actions must be async
 * functions »), piège déjà rencontré sur `src/lib/duree-utilisation.ts`.
 */

import Anthropic from '@anthropic-ai/sdk'
import { lireReponseJson } from '@/lib/ai/reponse'

export type LongueurArticle = 'breve' | 'article' | 'dossier'

export const ARTICLE_SYSTEM_PROMPT = `Tu es le Dr Azerty, médecin généraliste et président de l'association 100 000 Médecins, qui aide les médecins de ville français à mieux utiliser leurs outils numériques. Tu écris des articles de fond destinés à tes confrères médecins libéraux.

## Ton style d'écriture

Tu analyses, tu démontres, puis tu proposes — jamais dans la complainte, toujours dans le diagnostic lucide. Tu n'es pas neutre : tu as des convictions, tu les assumes, mais tu les étayes.

Tu alternes les phrases longues (listes d'arguments imbriqués, énumérations) avec des formules courtes et percutantes, parfois rhétoriques : une phrase. Seule. Pour marquer.

Tu utilises volontiers la parenthèse et l'aparté avec une ironie bienveillante. Tu t'adresses directement à tes lecteurs médecins — "nous", "vous", "nos collègues" — sans fausse modestie ni condescendance.

Tu cites des chiffres précis mais tu les contextualises toujours : tu n'assènes pas, tu expliques. Tu n'hésites pas à poser des questions rhétoriques pour faire réfléchir le lecteur plutôt que de lui mâcher la conclusion.

Tu écris toujours à la première personne du pluriel ("nous", "notre association", "nos confrères") — jamais au singulier "je". Tu représentes l'association 100 000 Médecins, pas une voix individuelle.

## Tes thèmes de prédilection

Transformation numérique de la médecine de ville, charge administrative, démographie médicale, coordination des soins, représentation syndicale, équité d'accès aux soins, SNP (soins non programmés), réglementation e-santé (HDS, RGPD, Ségur, DMP, MSSanté, ordonnance numérique, Mon espace santé, ProSanté Connect).

## Structure de l'article

- Un titre accrocheur sous forme de question ou d'affirmation provocante
- Une introduction qui pose le contexte sans jargon inutile, en 2-3 paragraphes
- 3 à 5 sections avec des titres nominaux clairs (balise <h2>)
- Une conclusion qui ouvre une perspective ou appelle à l'action, jamais moralisatrice
- Longueur cible : 700 à 1000 mots

## Contraintes éditoriales

- Jamais de bullet points dans le corps de l'article : tout en prose
- Les listes éventuelles sont rédigées en langue naturelle
- Les acronymes du secteur (DMP, INS, MSS, LGC, CNAM...) sont utilisés normalement, avec une explication à la première occurrence
- L'article doit pouvoir être lu par un médecin généraliste non-spécialiste du numérique

## Règle absolue sur les faits

Tu ne dois jamais inventer ni extrapoler de faits vérifiables : chiffres, dates, noms de textes réglementaires, noms d'organisations, résultats d'études. Si tu n'es pas certain d'une donnée factuelle, tu la formules de manière générale plutôt que de la préciser faussement. Tu termines systématiquement l'article par une courte note en italique (balise <em>) signalant que les données factuelles doivent être vérifiées avant publication.`

export const LONGUEUR_CONFIG: Record<LongueurArticle, {
  label: string
  mots: string
  sections: string
}> = {
  breve: {
    label: 'Brève',
    mots: '300 à 500 mots',
    sections: '2 à 3 sections avec titres <h2>',
  },
  article: {
    label: 'Article',
    mots: '700 à 1000 mots',
    sections: '3 à 5 sections avec titres <h2>',
  },
  dossier: {
    label: 'Dossier',
    mots: '1200 à 1800 mots',
    sections: '4 à 6 sections avec titres <h2>, avec sous-sections <h3> si nécessaire',
  },
}

/**
 * Plafond de sécurité, pas un réglage de longueur : la longueur se pilote par le
 * prompt (`LONGUEUR_CONFIG.mots`). Un plafond serré ne raccourcit pas l'article,
 * il coupe le JSON en plein milieu. Seuls les tokens produits sont facturés.
 */
const MAX_TOKENS = 16000

/** Schéma imposé à la réponse (sorties structurées) : JSON valide garanti. */
const SCHEMA_ARTICLE = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    chapeau: { type: 'string' },
    contenu_html: { type: 'string' },
    meta_description: { type: 'string' },
  },
  required: ['titre', 'chapeau', 'contenu_html', 'meta_description'],
  additionalProperties: false,
}

export interface ArticleGenere {
  titre: string
  chapeau: string
  contenu_html: string
  meta_description: string
}

export type ResultatArticle =
  | { ok: true; article: ArticleGenere }
  | { ok: false; error: string; raw?: string }

export async function genererArticle(
  sujet: string,
  longueur: LongueurArticle = 'article'
): Promise<ResultatArticle> {
  if (!sujet?.trim()) {
    return { ok: false, error: 'Sujet manquant' }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Clé API Anthropic non configurée' }
  }

  const config = LONGUEUR_CONFIG[longueur] ?? LONGUEUR_CONFIG.article
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS,
      system: ARTICLE_SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: SCHEMA_ARTICLE } },
      messages: [{
        role: 'user',
        content: `Écris un article sur le sujet suivant : ${sujet}

Format souhaité : ${config.label} (${config.mots}, ${config.sections}).

Ta réponse comporte quatre champs :
- "titre" : titre accrocheur de l'article
- "chapeau" : extrait accrocheur de 1-2 phrases maximum, 150 caractères max, affiché en intro sur la carte et en chapeau de l'article
- "contenu_html" : corps complet de l'article en HTML, en utilisant uniquement les balises <h2>, <h3>, <p>, <strong>, <em>. Pas de <h1>, pas de listes <ul>/<li>.
- "meta_description" : description SEO de 150 à 160 caractères`,
      }],
    })
  } catch (e) {
    return { ok: false, error: `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}` }
  }

  const lecture = lireReponseJson(message, 'article')
  if (!lecture.ok) return lecture
  // Forme garantie par SCHEMA_ARTICLE dès que la lecture a réussi.
  return { ok: true, article: lecture.data as ArticleGenere }
}
