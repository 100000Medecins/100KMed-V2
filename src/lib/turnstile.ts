// Vérification serveur d'un token Cloudflare Turnstile (anti-bot, formulaire d'inscription).
// Cf. docs/2026-04-27-email-architecture.md n'est pas concerné — ceci est purement anti-bot.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Vérifie un token Turnstile côté serveur.
 *
 * - Si `TURNSTILE_SECRET_KEY` n'est pas configurée → renvoie `true` (dégradation
 *   gracieuse : permet le dev local et un déploiement avant la mise en place des clés).
 * - Sinon → POST vers l'endpoint `siteverify` de Cloudflare ; renvoie `true`
 *   uniquement si Cloudflare valide le token (`success: true`).
 *
 * Les tokens Turnstile sont à usage unique et expirent après ~5 min : un token
 * rejoué ou périmé renverra `false`.
 */
export async function verifyTurnstileToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // Turnstile non configuré → on ne bloque pas
  if (!token) return false

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
