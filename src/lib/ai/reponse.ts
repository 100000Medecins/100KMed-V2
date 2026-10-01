/**
 * Lecture des réponses JSON du modèle — partagée par la rédaction d'article
 * (`article.ts`) et les propositions de sujets (`propositions-sujets.ts`).
 *
 * Les deux appels utilisent les sorties structurées (`output_config.format`) :
 * l'API garantit un JSON conforme au schéma. Restent deux cas où ce n'est pas
 * vrai, signalés par `stop_reason` et qu'il faut nommer comme tels au lieu de
 * les confondre avec un « JSON invalide » :
 *   - `max_tokens` : réponse coupée. Sur les modèles qui réfléchissent (Sonnet 5),
 *     la réflexion est décomptée du même plafond que la réponse ;
 *   - `refusal` : le modèle a décliné, la sortie ne suit pas le schéma.
 *
 * ⚠️ Pas de `'use server'` : ce module exporte des helpers synchrones.
 */

import type Anthropic from '@anthropic-ai/sdk'

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

export type LectureJson =
  | { ok: true; data: unknown }
  | { ok: false; error: string; raw: string }

/**
 * Trace serveur d'un échec : l'admin ne voit qu'un message court. Le début ET la
 * fin de la réponse sont conservés — une réponse tronquée ne se voit qu'à la fin.
 */
function tracerEchec(contexte: string, error: string, message: Anthropic.Message, raw: string) {
  console.error(`[ai:${contexte}] ${error}`, {
    stop_reason: message.stop_reason,
    output_tokens: message.usage.output_tokens,
    longueur: raw.length,
    debut: raw.slice(0, 500),
    fin: raw.length > 500 ? raw.slice(-500) : '',
  })
}

export function lireReponseJson(message: Anthropic.Message, contexte: string): LectureJson {
  const raw = extraireTexte(message.content)

  let error: string
  if (message.stop_reason === 'max_tokens') {
    error = 'La réponse de Claude a été coupée avant la fin (plafond de tokens atteint).'
  } else if (message.stop_reason === 'refusal') {
    error = 'Claude a refusé de traiter cette demande.'
  } else {
    try {
      return { ok: true, data: JSON.parse(raw) }
    } catch {
      error = "La réponse de Claude n'est pas un JSON valide."
    }
  }

  tracerEchec(contexte, error, message, raw)
  return { ok: false, error, raw }
}
