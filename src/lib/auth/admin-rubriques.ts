/**
 * Rôles de l'admin et rubriques ouvertes au rôle « contenus » (community manager).
 * Sans dépendance serveur : lu par le proxy, le layout et la navigation (composant client).
 */
export type RoleAdmin = 'admin' | 'contenu'

export const RUBRIQUES_CONTENU = [
  '/admin/blog',
  '/admin/annonces',
  '/admin/videos',
  '/admin/citations',
  '/admin/newsletters',
  '/admin/planning',
] as const

export const ACCUEIL_PAR_ROLE: Record<RoleAdmin, string> = {
  admin: '/admin/solutions',
  contenu: '/admin/blog',
}

export function cheminAutorise(role: RoleAdmin, pathname: string): boolean {
  if (role === 'admin') return true
  return RUBRIQUES_CONTENU.some((r) => pathname === r || pathname.startsWith(r + '/'))
}
