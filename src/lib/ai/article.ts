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
  max_tokens: number
}> = {
  breve: {
    label: 'Brève',
    mots: '300 à 500 mots',
    sections: '2 à 3 sections avec titres <h2>',
    max_tokens: 1500,
  },
  article: {
    label: 'Article',
    mots: '700 à 1000 mots',
    sections: '3 à 5 sections avec titres <h2>',
    max_tokens: 3000,
  },
  dossier: {
    label: 'Dossier',
    mots: '1200 à 1800 mots',
    sections: '4 à 6 sections avec titres <h2>, avec sous-sections <h3> si nécessaire',
    max_tokens: 5000,
  },
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

/**
 * Concatène les blocs de texte d'une réponse du modèle.
 *
 * ⚠️ Ne JAMAIS lire `content[0]` directement : les modèles récents renvoient un
 * bloc `thinking` en première position. `content[0].text` est alors vide, et le
 * `JSON.parse` échoue sur « réponse invalide » alors que le modèle a bien
 * répondu — le texte se trouve simplement dans un bloc suivant.
 */
export function extraireTexte(content: Array<{ type: string }>): string {
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/** Retire les backticks que le modèle ajoute parfois malgré la consigne. */
export function nettoyerJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

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

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: config.max_tokens,
      system: ARTICLE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Écris un article sur le sujet suivant : ${sujet}

Format souhaité : ${config.label} (${config.mots}, ${config.sections}).

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks, sans commentaires), avec exactement ces quatre champs :
- "titre" : titre accrocheur de l'article
- "chapeau" : extrait accrocheur de 1-2 phrases maximum, 150 caractères max, affiché en intro sur la carte et en chapeau de l'article
- "contenu_html" : corps complet de l'article en HTML, en utilisant uniquement les balises <h2>, <h3>, <p>, <strong>, <em>. Pas de <h1>, pas de listes <ul>/<li>.
- "meta_description" : description SEO de 150 à 160 caractères`,
      }],
    })
    raw = extraireTexte(message.content)
  } catch (e) {
    return { ok: false, error: `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}` }
  }

  try {
    return { ok: true, article: JSON.parse(nettoyerJson(raw)) as ArticleGenere }
  } catch {
    return { ok: false, error: "La réponse de Claude n'est pas un JSON valide.", raw }
  }
}
