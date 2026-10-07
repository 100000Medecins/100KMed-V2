import 'server-only'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

/**
 * Contrôle de la session admin (cookie `admin_token`, HMAC de `ADMIN_PASSWORD`) pour les
 * actions serveur. Module partagé : les fichiers d'actions plus anciens (`admin.ts`,
 * `propositions.ts`…) ont chacun leur copie.
 */
export async function assertAdmin(): Promise<void> {
  const attendu = createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
  const cookieStore = await cookies()
  if (cookieStore.get('admin_token')?.value !== attendu) throw new Error('Non autorisé')
}
