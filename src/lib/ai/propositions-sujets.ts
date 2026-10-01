/**
 * Moteur de propositions de sujets d'articles.
 *
 * Appelé par deux entrées qui partagent strictement le même code :
 *   - le cron hebdomadaire `/api/cron/proposer-sujets-articles`
 *   - l'action « Regénérer » de l'admin blog, avec un cadrage libre
 *
 * Chaîne : recherche d'actualité (Tavily) → synthèse éditoriale (Claude) → 3 sujets.
 *
 * ⚠️ Pas de `'use server'` ici : ce module expose des constantes et des helpers
 * synchrones, qu'un fichier `'use server'` interdirait (tous les exports devraient
 * être async — piège déjà documenté sur `src/lib/duree-utilisation.ts`).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { LongueurArticle } from '@/lib/ai/article'
import { lireReponseJson } from '@/lib/ai/reponse'

/** Jugement éditorial : un appel par semaine, l'écart de coût est négligeable. */
const MODELE = 'claude-sonnet-5'

/**
 * Sonnet 5 réfléchit avant de répondre, et cette réflexion est décomptée du même
 * plafond que la réponse. À 2000, une réflexion un peu longue (beaucoup
 * d'actualités, longues listes d'exclusion) coupait le JSON en plein milieu.
 * Seuls les tokens produits sont facturés : la marge ne coûte rien.
 */
const MAX_TOKENS = 16000

export const NB_PROPOSITIONS = 3

/** Mix par défaut demandé : 2 sujets d'actualité + 1 dossier de fond. */
export const MIX_PAR_DEFAUT = { actu: 2, dossier: 1 }

/** Requêtes d'actualité e-santé, volontairement complémentaires. */
const REQUETES_ACTU = [
  'actualité e-santé médecins libéraux France',
  'Ségur du numérique en santé Mon espace santé ordonnance numérique actualité',
  'CNAM convention médicale téléconsultation logiciel métier médecin actualité',
]

export interface SourceActu {
  titre: string
  url: string
}

export interface PropositionGeneree {
  titre: string
  angle: string
  type: 'actu' | 'dossier'
  longueur: LongueurArticle
  sources: SourceActu[]
}

export type ResultatPropositions =
  | { ok: true; propositions: PropositionGeneree[]; nbSources: number }
  | { ok: false; error: string; raw?: string }

/**
 * Lundi de la semaine d'une date, au format YYYY-MM-DD.
 * Sert de clé d'anti-doublon du cron : deux exécutions la même semaine
 * (re-déclenchement manuel, retry Vercel) ne créent qu'un seul lot.
 */
export function lundiDeLaSemaine(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // getUTCDay() : 0 = dimanche → on ramène le dimanche au lundi précédent (décalage 6).
  const decalage = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - decalage)
  return d.toISOString().slice(0, 10)
}

interface ReponseTavily {
  answer?: string
  results?: Array<{ title: string; url: string; content: string }>
}

async function chercherActu(query: string, apiKey: string): Promise<ReponseTavily | null> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic: 'news',
        days: 14,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5,
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as ReponseTavily
  } catch {
    return null
  }
}

/**
 * Agrège les résultats des requêtes en un contexte texte + la liste des sources
 * réellement rapportées. Cette liste est la SEULE autorisée dans les propositions.
 */
async function rassemblerActualites(apiKey: string): Promise<{ contexte: string; sources: SourceActu[] }> {
  const reponses = await Promise.all(REQUETES_ACTU.map((q) => chercherActu(q, apiKey)))

  const parts: string[] = []
  const sources: SourceActu[] = []
  const urlsVues = new Set<string>()

  reponses.forEach((data, i) => {
    if (!data) return
    if (data.answer) parts.push(`[Synthèse — ${REQUETES_ACTU[i]}]\n${data.answer}`)
    for (const r of data.results ?? []) {
      if (!r.url || urlsVues.has(r.url)) continue
      urlsVues.add(r.url)
      sources.push({ titre: r.title, url: r.url })
      parts.push(`- ${r.title} (${r.url})\n  ${(r.content ?? '').slice(0, 400)}`)
    }
  })

  return { contexte: parts.join('\n\n'), sources }
}

/**
 * Ne conserve que les sources dont l'URL a réellement été rapportée par Tavily.
 * Sans ce filtre, une URL inventée par le modèle passerait pour une référence
 * vérifiée — exactement le contraire de ce que la colonne `sources` doit garantir.
 */
function filtrerSourcesConnues(urls: string[], connues: SourceActu[]): SourceActu[] {
  const parUrl = new Map(connues.map((s) => [s.url, s]))
  const retenues: SourceActu[] = []
  for (const url of urls) {
    const connue = parUrl.get(url)
    if (connue && !retenues.includes(connue)) retenues.push(connue)
  }
  return retenues
}

const LONGUEURS_VALIDES: LongueurArticle[] = ['breve', 'article', 'dossier']

/**
 * Schéma imposé à la réponse (sorties structurées) : JSON valide garanti.
 * Les sorties structurées exigent un objet à la racine, d'où l'enveloppe
 * `propositions`. Le nombre de sujets reste demandé dans le prompt : le schéma
 * ne sait pas borner la taille d'un tableau.
 */
const SCHEMA_PROPOSITIONS = {
  type: 'object',
  properties: {
    propositions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          angle: { type: 'string' },
          type: { type: 'string', enum: ['actu', 'dossier'] },
          longueur: { type: 'string', enum: LONGUEURS_VALIDES },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre', 'angle', 'type', 'longueur', 'sources'],
        additionalProperties: false,
      },
    },
  },
  required: ['propositions'],
  additionalProperties: false,
}

/** Forme de la réponse, telle que garantie par `SCHEMA_PROPOSITIONS`. */
interface ReponsePropositions {
  propositions: Array<{
    titre: string
    angle: string
    type: 'actu' | 'dossier'
    longueur: LongueurArticle
    sources: string[]
  }>
}

export interface OptionsPropositions {
  /** Cadrage libre saisi dans l'admin (« plutôt côté téléconsultation », etc.). */
  cadrage?: string | null
  /** Titres d'articles déjà publiés — pour ne pas reproposer un sujet traité. */
  titresPublies?: string[]
  /** Titres déjà proposés récemment — pour ne pas tourner en rond d'une semaine à l'autre. */
  titresDejaProposes?: string[]
}

export async function genererPropositions(
  options: OptionsPropositions = {}
): Promise<ResultatPropositions> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Clé API Anthropic non configurée' }
  }

  const tavilyKey = process.env.TAVILY_API_KEY
  const { contexte, sources } = tavilyKey
    ? await rassemblerActualites(tavilyKey)
    : { contexte: '', sources: [] as SourceActu[] }

  // Sans actualité exploitable, on ne fabrique pas de faux sujets « chauds » :
  // on bascule entièrement sur des dossiers de fond, qui ne périment pas.
  const actuDisponible = sources.length > 0
  const consigneMix = actuDisponible
    ? `Propose exactement ${MIX_PAR_DEFAUT.actu} sujets de type "actu" (accrochés à l'actualité ci-dessus) et ${MIX_PAR_DEFAUT.dossier} sujet de type "dossier" (sujet de fond, intemporel, réutilisable dans plusieurs semaines).`
    : `Aucune actualité n'a pu être récupérée cette semaine : propose ${NB_PROPOSITIONS} sujets de type "dossier" uniquement (sujets de fond, intemporels). N'invente AUCUNE actualité.`

  const blocPublies = options.titresPublies?.length
    ? `\n\nARTICLES DÉJÀ PUBLIÉS (ne repropose aucun de ces sujets, même reformulé) :\n${options.titresPublies.map((t) => `- ${t}`).join('\n')}`
    : ''

  const blocProposes = options.titresDejaProposes?.length
    ? `\n\nSUJETS DÉJÀ PROPOSÉS RÉCEMMENT (écartés ou en attente — propose autre chose) :\n${options.titresDejaProposes.map((t) => `- ${t}`).join('\n')}`
    : ''

  const blocCadrage = options.cadrage?.trim()
    ? `\n\nCADRAGE DEMANDÉ PAR LA RÉDACTION — il prime sur tout le reste :\n${options.cadrage.trim()}`
    : ''

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: MODELE,
      max_tokens: MAX_TOKENS,
      output_config: { format: { type: 'json_schema', schema: SCHEMA_PROPOSITIONS } },
      system: `Tu es le rédacteur en chef du blog de "100 000 Médecins", une association qui aide les médecins libéraux français à mieux utiliser leurs outils numériques.

Ton lectorat : des médecins généralistes et spécialistes de ville, pas des experts du numérique. Ils sont pressés, lucides, allergiques au jargon marketing.

Thèmes du blog : transformation numérique de la médecine de ville, charge administrative, démographie médicale, coordination des soins, représentation syndicale, équité d'accès aux soins, soins non programmés, réglementation e-santé (HDS, RGPD, Ségur, DMP, MSSanté, ordonnance numérique, Mon espace santé, Pro Santé Connect).

Ton travail ici n'est pas d'écrire des articles, mais de proposer des SUJETS : un titre de travail et un angle qui servira de brief au rédacteur.

Règle absolue : tu ne fabriques jamais une actualité. Tu ne t'appuies que sur les éléments qui te sont fournis. Si un sujet repose sur un fait dont tu n'es pas certain, formule l'angle de manière prudente plutôt que d'affirmer un chiffre ou une date.`,
      messages: [{
        role: 'user',
        content: `${actuDisponible ? `ACTUALITÉ RÉCENTE (14 derniers jours) :\n${contexte}` : "Aucune actualité récente n'a pu être récupérée."}${blocPublies}${blocProposes}${blocCadrage}

${consigneMix}

Pour chaque sujet :
- "titre" : titre de travail, court et parlant (ce n'est pas le titre final de l'article)
- "angle" : 2 à 4 phrases décrivant l'angle, ce que l'article doit démontrer et pourquoi ça intéresse un médecin libéral. Ce texte servira directement de brief de rédaction.
- "type" : "actu" ou "dossier"
- "longueur" : "breve", "article" ou "dossier" selon l'ampleur du sujet
- "sources" : pour un sujet de type "actu", la liste des URLs pertinentes. Elles doivent provenir EXCLUSIVEMENT de la liste ci-dessus, copiées à l'identique. N'invente jamais d'URL. Pour un "dossier", laisse la liste vide.

Renvoie exactement ${NB_PROPOSITIONS} sujets dans "propositions".`,
      }],
    })
  } catch (e) {
    return { ok: false, error: `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}` }
  }

  const lecture = lireReponseJson(message, 'propositions-sujets')
  if (!lecture.ok) return lecture
  const { propositions: brutes } = lecture.data as ReponsePropositions

  const propositions = brutes
    .slice(0, NB_PROPOSITIONS)
    .map((p): PropositionGeneree => {
      // Sans actualité récupérée, aucun sujet ne peut être « actu », quoi qu'en dise le modèle.
      const type = actuDisponible ? p.type : 'dossier'
      return {
        titre: p.titre.trim(),
        angle: p.angle.trim(),
        type,
        longueur: p.longueur,
        sources: type === 'actu' ? filtrerSourcesConnues(p.sources, sources) : [],
      }
    })
    .filter((p) => p.titre && p.angle)

  if (propositions.length === 0) {
    console.error('[ai:propositions-sujets] aucune proposition exploitable', lecture.data)
    return { ok: false, error: 'Aucune proposition exploitable dans la réponse.' }
  }

  return { ok: true, propositions, nbSources: sources.length }
}
