import { NextResponse } from 'next/server'
import { HOTE_DEV, PREFIXE_ETAT_RELAIS_DEV } from '@/lib/auth/psc'

/**
 * GET /connexionPsc
 *
 * URI de retour enregistrée chez Pro Santé Connect (https://www.100000medecins.org/connexionPsc),
 * commune à la production et à dev (mode relais, `NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI`).
 *
 * - `state` préfixé `devsite_` : la connexion a été lancée depuis dev.100000medecins.org →
 *   renvoi vers le callback de dev (cookies, session et code de dev). Hôte écrit en dur :
 *   jamais de redirection vers un hôte lu dans la requête.
 * - Sinon (production : `state` préfixé `dev_`, héritage de l'ancien site) → callback local.
 *
 * Tous les paramètres (code, state, session_state…) sont conservés.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const versDev = url.searchParams.get('state')?.startsWith(PREFIXE_ETAT_RELAIS_DEV) ?? false
  const base = versDev ? `https://${HOTE_DEV}` : url.origin
  const target = new URL(base + '/api/auth/psc-callback')
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value))
  return NextResponse.redirect(target, { status: 302 })
}
