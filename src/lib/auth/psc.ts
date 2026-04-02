/**
 * Configuration Pro Santé Connect (PSC) — flow OIDC manuel.
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_PSC_CLIENT_ID  — Client ID PSC (visible côté client)
 *   PSC_CLIENT_SECRET          — Client Secret PSC (serveur uniquement)
 *   NEXT_PUBLIC_PSC_ENV        — "bas" (défaut) ou "production"
 */

const PSC_ENVS = {
  bas: {
    authorization: 'https://wallet.bas.psc.esante.gouv.fr/auth',
    token: 'https://auth.bas.psc.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/token',
    userinfo: 'https://auth.bas.psc.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/userinfo',
    logout: 'https://auth.bas.psc.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/logout',
  },
  production: {
    authorization: 'https://wallet.esw.esante.gouv.fr/auth',
    token: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/token',
    userinfo: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/userinfo',
    logout: 'https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/logout',
  },
} as const

const pscEnv = (process.env.NEXT_PUBLIC_PSC_ENV === 'production' ? 'production' : 'bas') as keyof typeof PSC_ENVS

export const PSC_ENDPOINTS = PSC_ENVS[pscEnv]

/**
 * Construit l'URL de redirection PSC + génère state/nonce.
 * Appelé côté client — stocke state/nonce dans des cookies.
 */
export function connectWithPsc(): void {
  const clientId = process.env.NEXT_PUBLIC_PSC_CLIENT_ID
  if (!clientId) {
    console.error('[PSC] NEXT_PUBLIC_PSC_CLIENT_ID manquant')
    return
  }

  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // Stocker dans des cookies (survivent aux redirects cross-contexte)
  const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
  document.cookie = `psc_state=${state}; path=/; expires=${expires}; SameSite=Lax`
  document.cookie = `psc_nonce=${nonce}; path=/; expires=${expires}; SameSite=Lax`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${window.location.origin}/api/auth/psc-callback`,
    scope: 'openid scope_all',
    acr_values: 'eidas1',
    state,
    nonce,
  })

  window.location.href = `${PSC_ENDPOINTS.authorization}?${params}`
}

/**
 * Échange le code d'autorisation PSC contre des tokens.
 */
export async function exchangePscCode(code: string, origin: string) {
  const res = await fetch(PSC_ENDPOINTS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/auth/psc-callback`,
      client_id: process.env.NEXT_PUBLIC_PSC_CLIENT_ID!,
      client_secret: process.env.PSC_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PSC token exchange failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<{
    access_token: string
    id_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
  }>
}

/**
 * Récupère les informations utilisateur depuis PSC via le userinfo endpoint.
 */
export async function getPscUserInfo(accessToken: string) {
  const res = await fetch(PSC_ENDPOINTS.userinfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`PSC userinfo failed (${res.status})`)
  }

  return res.json() as Promise<{
    sub: string
    given_name?: string
    family_name?: string
    preferred_username?: string
    email?: string
    SubjectNameID?: string
    [key: string]: unknown
  }>
}

/**
 * Extrait le RPPS depuis les infos utilisateur PSC.
 */
export function extractRpps(userInfo: Record<string, unknown>): string | null {
  if (userInfo.preferred_username) return String(userInfo.preferred_username)
  if (userInfo.SubjectNameID) return String(userInfo.SubjectNameID)

  if (Array.isArray(userInfo.otherIds)) {
    const entry = userInfo.otherIds.find(
      (e: { origine?: string }) => e.origine === 'RPPS'
    )
    if (entry && 'identifiant' in entry) return String(entry.identifiant)
  }

  return null
}
