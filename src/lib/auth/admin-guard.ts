import 'server-only'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

/**
 * Contrôle de la session admin (cookie `admin_token`, HMAC de `ADMIN_PASSWORD`).
 * Module partagé : les fichiers d'actions plus anciens (`admin.ts`, `propositions.ts`…)
 * ont chacun leur copie.
 */
export async function estAdmin(): Promise<boolean> {
  const attendu = createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
  const cookieStore = await cookies()
  return cookieStore.get('admin_token')?.value === attendu
}

/** Pour les actions serveur : lève une erreur hors session admin. */
export async function assertAdmin(): Promise<void> {
  if (!(await estAdmin())) throw new Error('Non autorisé')
}
