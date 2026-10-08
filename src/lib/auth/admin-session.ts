import { createHmac } from 'crypto'
import type { RoleAdmin } from './admin-rubriques'

/**
 * Valeur du cookie `admin_token` de chaque rôle : HMAC du mot de passe du rôle.
 * Changer un mot de passe ferme les sessions de ce rôle. Sans `ADMIN_CONTENU_PASSWORD`,
 * le rôle « contenus » n'existe pas.
 *
 * Lu par le proxy : ni `server-only` ni `next/headers` ici. Ne pas importer côté client.
 */
export function jetonSession(role: RoleAdmin): string | null {
  const motDePasse = role === 'admin' ? process.env.ADMIN_PASSWORD : process.env.ADMIN_CONTENU_PASSWORD
  if (!motDePasse) return null
  return createHmac('sha256', motDePasse)
    .update(role === 'admin' ? 'admin-session' : 'contenu-session')
    .digest('hex')
}

export function roleDepuisJeton(jeton: string | undefined): RoleAdmin | null {
  if (!jeton) return null
  if (jeton === jetonSession('admin')) return 'admin'
  if (jeton === jetonSession('contenu')) return 'contenu'
  return null
}

export function roleDepuisMotDePasse(motDePasse: string): RoleAdmin | null {
  if (!motDePasse) return null
  if (motDePasse === process.env.ADMIN_PASSWORD) return 'admin'
  if (process.env.ADMIN_CONTENU_PASSWORD && motDePasse === process.env.ADMIN_CONTENU_PASSWORD) return 'contenu'
  return null
}
