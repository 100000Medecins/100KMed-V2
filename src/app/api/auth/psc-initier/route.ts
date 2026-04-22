import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { PSC_ENDPOINTS } from '@/lib/auth/psc'

/**
 * GET /api/auth/psc-initier?token=XXX
 *
 * Initie le flow PSC côté serveur.
 * Le token de vérification est encodé dans le paramètre `state` de PSC
 * pour être récupéré dans le callback et lier l'évaluation anonyme.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')

  const clientId = process.env.NEXT_PUBLIC_PSC_CLIENT_ID
  if (!clientId) {
    console.error('[PSC] NEXT_PUBLIC_PSC_CLIENT_ID manquant')
    return NextResponse.redirect(`${origin}/connexion?error=psc_config_error`)
  }

  const stateUuid = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // Mode relay : préfixe "dev_" pour que le .htaccess Gandi identifie ce callback
  // et le redirige vers dev.100000medecins.org plutôt que de le traiter en local.
  // Format state : "[dev_]stateUuid[|tokenVerification]"
  const relayRedirectUri = process.env.NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI
  const statePrefix = relayRedirectUri ? 'dev_' : ''
  const state = token ? `${statePrefix}${stateUuid}|${token}` : `${statePrefix}${stateUuid}`
  const redirectUri = relayRedirectUri ?? `${origin}/api/auth/psc-callback`

  const cookieStore = await cookies()
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  cookieStore.set('psc_state', stateUuid, { path: '/', expires, sameSite: 'lax' })
  cookieStore.set('psc_nonce', nonce, { path: '/', expires, sameSite: 'lax' })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid scope_all',
    acr_values: 'eidas1',
    state,
    nonce,
  })

  return NextResponse.redirect(`${PSC_ENDPOINTS.authorization}?${params}`)
}
