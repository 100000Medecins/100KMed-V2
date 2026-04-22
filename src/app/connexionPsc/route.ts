import { NextResponse } from 'next/server'

/**
 * GET /connexionPsc
 *
 * Route de compatibilité PSC — deux rôles selon la phase de déploiement :
 *
 * Phase 1 (test, DNS = Gandi) :
 *   Cette route n'est jamais appelée sur dev.100000medecins.org car le .htaccess
 *   de Gandi intercepte /connexionPsc et redirige vers /api/auth/psc-callback.
 *   Elle est présente pour la complétude.
 *
 * Phase 2 (après basculement DNS, www → ce serveur Next.js) :
 *   PSC redirige vers https://www.100000medecins.org/connexionPsc (URI enregistrée).
 *   Ce serveur reçoit la requête et la relaie vers /api/auth/psc-callback
 *   en préservant tous les query params (code, state, session_state…).
 *   Aucune modification de la configuration PSC nécessaire.
 *
 * Pour rollback : cette route peut rester indéfiniment sans effet secondaire.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const target = new URL(url.origin + '/api/auth/psc-callback')
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value))
  return NextResponse.redirect(target, { status: 302 })
}
