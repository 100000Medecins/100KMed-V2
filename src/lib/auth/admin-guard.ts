import 'server-only'
import { cookies } from 'next/headers'
import { roleDepuisJeton } from './admin-session'
import type { RoleAdmin } from './admin-rubriques'

/**
 * Contrôle de la session admin (cookie `admin_token`). Module partagé : les fichiers
 * d'actions plus anciens ont chacun leur copie, qui ne reconnaît que l'admin complet
 * (le rôle « contenus » y est donc refusé par défaut).
 */
export async function roleAdmin(): Promise<RoleAdmin | null> {
  const cookieStore = await cookies()
  return roleDepuisJeton(cookieStore.get('admin_token')?.value)
}

/** Admin complet uniquement. */
export async function estAdmin(): Promise<boolean> {
  return (await roleAdmin()) === 'admin'
}

/** Admin ou rôle « contenus » : actions et routes des rubriques de la community manager. */
export async function estAdminOuContenu(): Promise<boolean> {
  return (await roleAdmin()) !== null
}

/** Pour les actions serveur : lève une erreur hors session admin complète. */
export async function assertAdmin(): Promise<void> {
  if (!(await estAdmin())) throw new Error('Non autorisé')
}

/** Pour les actions serveur des rubriques « contenus ». */
export async function assertAdminOuContenu(): Promise<void> {
  if (!(await estAdminOuContenu())) throw new Error('Non autorisé')
}
