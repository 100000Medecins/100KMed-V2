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
import { extraireTexte, nettoyerJson, type LongueurArticle } from '@/lib/ai/article'

/** Jugement éditorial : un appel par semaine, l'écart de coût est négligeable. */
const MODELE = 'claude-sonnet-5'

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
function filtrerSourcesConnues(proposees: unknown, connues: SourceActu[]): SourceActu[] {
  if (!Array.isArray(proposees)) return []
  const parUrl = new Map(connues.map((s) => [s.url, s]))
  const retenues: SourceActu[] = []
  for (const p of proposees) {
    const url = typeof p === 'object' && p !== null ? (p as { url?: unknown }).url : null
    if (typeof url !== 'string') continue
    const connue = parUrl.get(url)
    if (connue && !retenues.some((r) => r.url === connue.url)) retenues.push(connue)
  }
  return retenues
}

const LONGUEURS_VALIDES: LongueurArticle[] = ['breve', 'article', 'dossier']

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

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: MODELE,
      max_tokens: 2000,
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
- "sources" : pour un sujet de type "actu", les URLs pertinentes. Elles doivent provenir EXCLUSIVEMENT de la liste ci-dessus, copiées à l'identique. N'invente jamais d'URL. Pour un "dossier", laisse un tableau vide.

Réponds UNIQUEMENT avec un tableau JSON valide de ${NB_PROPOSITIONS} objets (sans markdown, sans backticks, sans commentaires).`,
      }],
    })
    raw = extraireTexte(message.content)
  } catch (e) {
    return { ok: false, error: `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}` }
  }

  let brut: unknown
  try {
    brut = JSON.parse(nettoyerJson(raw))
  } catch {
    return { ok: false, error: "La réponse de Claude n'est pas un JSON valide.", raw }
  }

  if (!Array.isArray(brut) || brut.length === 0) {
    return { ok: false, error: 'Réponse inattendue : tableau de propositions vide.', raw }
  }

  const propositions: PropositionGeneree[] = brut
    .slice(0, NB_PROPOSITIONS)
    // Annotation nécessaire : sans contexte de type, TypeScript élargit `type`
    // en `string` au lieu de conserver l'union 'actu' | 'dossier'.
    .map((p): PropositionGeneree => {
      const o = (p ?? {}) as Record<string, unknown>
      const type = o.type === 'dossier' || !actuDisponible ? 'dossier' : 'actu'
      const longueur = LONGUEURS_VALIDES.includes(o.longueur as LongueurArticle)
        ? (o.longueur as LongueurArticle)
        : 'article'
      return {
        titre: String(o.titre ?? '').trim(),
        angle: String(o.angle ?? '').trim(),
        type,
        longueur,
        sources: type === 'actu' ? filtrerSourcesConnues(o.sources, sources) : [],
      }
    })
    .filter((p) => p.titre && p.angle)

  if (propositions.length === 0) {
    return { ok: false, error: 'Aucune proposition exploitable dans la réponse.', raw }
  }

  return { ok: true, propositions, nbSources: sources.length }
}
