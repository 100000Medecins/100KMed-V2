/**
 * Résilience aux erreurs d'authentification TRANSITOIRES de GoTrue (Supabase).
 *
 * Contexte (2026-07-23) : le projet signe ses JWT avec une clé asymétrique
 * **ECC P-256** (migration il y a ~5 mois, l'ancienne HS256 restant en
 * « previously used »), et utilise les clés API `sb_secret_`/`sb_publishable_`.
 * Par intermittence, une instance GoTrue rejette un appel avec :
 *
 *   `invalid JWT: … unrecognized JWT kid <nil> for algorithm ES256` (code `bad_jwt`)
 *
 * …alors que le même appel passe sur une autre instance (mesuré ~1 échec / 12).
 * C'est une incohérence côté infra Supabase, pas une clé invalide : sans retry, un
 * échec fait planter une **inscription**, un **login PSC** ou une **fusion de comptes**
 * (avec, pour la fusion, un risque d'état partiel).
 *
 * On ne retente QUE cette signature d'erreur — toute autre erreur remonte
 * immédiatement, sans masquer un vrai problème.
 */

/** Vrai uniquement pour l'erreur transitoire de vérification JWT décrite ci-dessus. */
export function isTransientAuthError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'string') return /unrecognized JWT kid/i.test(err)
  const e = err as { message?: unknown; code?: unknown }
  const message = typeof e.message === 'string' ? e.message : ''
  const code = typeof e.code === 'string' ? e.code : ''
  return /unrecognized JWT kid/i.test(message) || code === 'bad_jwt'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Exécute un appel Supabase Auth en retentant les échecs transitoires.
 *
 * Gère les deux formes de remontée d'erreur du SDK : objet `{ error }` renvoyé,
 * ou exception levée (`AuthApiError`). Backoff linéaire court (250/500/750 ms).
 *
 * @example
 * const { error } = await retryTransientAuth(() => supabase.auth.admin.deleteUser(id))
 */
export async function retryTransientAuth<T extends { error?: { message?: string } | null }>(
  fn: () => Promise<T>,
  tries = 4,
  delayMs = 250
): Promise<T> {
  let lastResult: T | undefined

  for (let attempt = 0; attempt < tries; attempt++) {
    const isLast = attempt === tries - 1
    try {
      const result = await fn()
      if (result?.error && isTransientAuthError(result.error) && !isLast) {
        lastResult = result
        await sleep(delayMs * (attempt + 1))
        continue
      }
      return result
    } catch (err: unknown) {
      if (!isTransientAuthError(err) || isLast) throw err
      await sleep(delayMs * (attempt + 1))
    }
  }

  // Inatteignable en pratique : la dernière tentative retourne ou lève.
  return lastResult as T
}
