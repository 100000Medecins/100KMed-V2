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
 *
 * options.userId          : UUID de l'utilisateur connecté (mode association PSC)
 * options.verificationToken : token de vérification pour lier une évaluation anonyme
 *
 * Format state : "[dev_]stateUuid|userId_or_underscore|verificationToken_or_underscore"
 */
export function connectWithPsc(options?: { userId?: string; verificationToken?: string }): void {
  const clientId = process.env.NEXT_PUBLIC_PSC_CLIENT_ID
  if (!clientId) {
    console.error('[PSC] NEXT_PUBLIC_PSC_CLIENT_ID manquant')
    return
  }

  // Mode relay : si NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI est défini, on utilise
  // l'URI enregistrée chez PSC (www.100000medecins.org/connexionPsc) comme
  // redirect_uri, et on préfixe le state avec "dev_" pour que le .htaccess
  // de l'ancien site puisse identifier et relayer ce callback vers dev.
  const relayRedirectUri = process.env.NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI
  const redirectUri = relayRedirectUri ?? `${window.location.origin}/api/auth/psc-callback`

  const stateUuid = crypto.randomUUID()
  const userIdPart = options?.userId || '_'
  const tokenPart = options?.verificationToken || '_'
  const stateData = `${stateUuid}|${userIdPart}|${tokenPart}`
  const state = relayRedirectUri ? `dev_${stateData}` : stateData
  const nonce = crypto.randomUUID()

  // Stocker dans des cookies (survivent aux redirects cross-contexte)
  const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
  document.cookie = `psc_state=${stateUuid}; path=/; expires=${expires}; SameSite=Lax`
  document.cookie = `psc_nonce=${nonce}; path=/; expires=${expires}; SameSite=Lax`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
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
/**
 * Échange le code d'autorisation PSC contre des tokens.
 * @param code   Code OAuth reçu en callback
 * @param redirectUri  URI exacte utilisée dans la demande d'autorisation initiale.
 *                     Doit correspondre à la lettre à ce qui a été envoyé à PSC.
 *                     En mode relay : https://www.100000medecins.org/connexionPsc
 *                     En mode direct : https://<domaine>/api/auth/psc-callback
 */
export async function exchangePscCode(code: string, redirectUri: string) {
  const res = await fetch(PSC_ENDPOINTS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
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
 * Extrait le code profession depuis les infos utilisateur PSC.
 * "10" = Médecin dans le référentiel CIOSSanté.
 */
export function extractCodeProfession(userInfo: Record<string, unknown>): string | null {
  const ref = userInfo.SubjectRefPro as { exercices?: Array<{ codeProfession?: string }> } | undefined
  return ref?.exercices?.[0]?.codeProfession ?? null
}

/**
 * Normalise un identifiant PSC en RPPS 11 chiffres.
 * PSC production renvoie parfois le format idNat_PS = "8" + RPPS 11 chiffres (12 chiffres total).
 */
function normaliseRpps(value: string): string {
  const v = value.trim()
  if (/^\d{12}$/.test(v) && v.startsWith('8')) return v.slice(1)
  return v
}

/**
 * Extrait le RPPS depuis les infos utilisateur PSC.
 */
export function extractRpps(userInfo: Record<string, unknown>): string | null {
  if (userInfo.preferred_username) return normaliseRpps(String(userInfo.preferred_username))
  if (userInfo.SubjectNameID) return normaliseRpps(String(userInfo.SubjectNameID))

  if (Array.isArray(userInfo.otherIds)) {
    const entry = userInfo.otherIds.find(
      (e: { origine?: string }) => e.origine === 'RPPS'
    )
    if (entry && 'identifiant' in entry) return normaliseRpps(String(entry.identifiant))
  }

  return null
}
