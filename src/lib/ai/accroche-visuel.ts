/**
 * Accroches du studio des visuels Instagram : quand le titre d'un article est trop long pour le
 * visuel, Claude propose trois accroches courtes, de la meilleure à la moins bonne.
 *
 * Sorties structurées (`output_config.format`) : le JSON est garanti, pas la longueur (le schéma
 * ne sait pas imposer « 50 caractères au plus ») ; chaque accroche est donc nettoyée et
 * contrôlée ici, et celles qui dépassent sont écartées.
 *
 * ⚠️ Pas de `'use server'` : appelé par l'action `proposerAccroches` (visuels-reseaux.ts).
 */

import Anthropic from '@anthropic-ai/sdk'
import { lireReponseJson } from './reponse'

export const ACCROCHE_MAX = 50

const SCHEMA_ACCROCHES = {
  type: 'object',
  properties: {
    accroches: { type: 'array', items: { type: 'string' } },
  },
  required: ['accroches'],
  additionalProperties: false,
}

const SYSTEME = `Tu écris les accroches des visuels Instagram de 100 000 Médecins, association de médecins libéraux français qui évalue les logiciels médicaux et défend l'intérêt des médecins face aux éditeurs. Sur le visuel d'un article, l'accroche remplace le titre quand il est trop long : elle s'affiche en gros caractères sur une photo et doit se comprendre seule, d'un coup d'œil, par un médecin qui fait défiler son fil.`

export type ResultatAccroches = { ok: true; accroches: string[] } | { ok: false; error: string }

const ENTITES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—' }

/** Texte lisible d'un contenu HTML d'article (balises retirées, entités décodées). */
function texteBrut(html: string): string {
  return html
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, nom: string) => ENTITES[nom.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Longueur en caractères visibles (une lettre accentuée compte pour un). */
export const longueurAccroche = (s: string) => [...s.normalize('NFC')].length

/** Accroche ramenée aux règles : sans emoji ni hashtag, sans guillemets autour, sans point final. */
export function nettoyerAccroche(brute: string): string {
  return brute
    .normalize('NFC')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/(^|\s)#\S+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[«"“]\s*(.*?)\s*[»"”]$/u, '$1')
    .replace(/[.…]+$/u, '')
    .trim()
}

export async function genererAccroches({
  titre,
  chapeau,
  contenuHtml,
}: {
  titre: string
  chapeau?: string | null
  contenuHtml?: string | null
}): Promise<ResultatAccroches> {
  if (!titre.trim()) return { ok: false, error: 'Titre manquant' }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'Clé API Anthropic non configurée' }

  const article = [
    `Titre : ${titre.trim()}`,
    chapeau?.trim() ? `Chapeau : ${chapeau.trim()}` : null,
    contenuHtml?.trim() ? `Article :\n${texteBrut(contenuHtml)}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEME,
      // Effort « medium » (le défaut de ce modèle, posé explicitement) : ce texte est publié, la
      // qualité compte plus que les quelques secondes gagnées en « low ».
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA_ACCROCHES } },
      messages: [
        {
          role: 'user',
          content: `Propose 3 accroches pour le visuel Instagram de l'article ci-dessous, de la meilleure à la moins bonne.

Règles pour chaque accroche :
- ${ACCROCHE_MAX} caractères au plus, espaces comprises : compte-les ;
- une phrase complète et naturelle : si elle dépasse, reformule-la plus court, ne la coupe jamais en cours de route ;
- en français, sans emoji, sans hashtag, sans guillemets autour, sans point final (un point d'interrogation ou d'exclamation reste possible s'il sert le sens) ;
- fidèle à l'article : n'annonce rien qu'il ne donne pas (ni chiffre, ni promesse, ni conclusion absents du texte) ;
- trois angles différents, pas trois variantes de la même phrase.

${article}`,
        },
      ],
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'Claude est très sollicité : réessayez dans une minute.' }
    if (e instanceof Anthropic.APIError) return { ok: false, error: `Erreur API Anthropic (${e.status ?? 'réseau'}) : ${e.message}` }
    return { ok: false, error: `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}` }
  }

  const lecture = lireReponseJson(message, 'accroche-visuel')
  if (!lecture.ok) return { ok: false, error: lecture.error }
  // Forme garantie par SCHEMA_ACCROCHES dès que la lecture a réussi.
  const brutes = (lecture.data as { accroches: unknown[] }).accroches.filter((a): a is string => typeof a === 'string')
  const accroches = [...new Set(brutes.map(nettoyerAccroche))].filter((a) => a && longueurAccroche(a) <= ACCROCHE_MAX)
  if (!accroches.length) {
    console.error('[ai:accroche-visuel] aucune accroche retenue', { brutes })
    return { ok: false, error: `Claude n'a pas proposé d'accroche de ${ACCROCHE_MAX} caractères au plus : réessayez.` }
  }
  return { ok: true, accroches: accroches.slice(0, 3) }
}
