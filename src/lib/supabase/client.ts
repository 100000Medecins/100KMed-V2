import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Crée un client Supabase côté navigateur (Client Components).
 * Le generic Database permet l'autocomplétion TypeScript sur les tables.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Remplace navigator.locks par un pass-through pour éviter les AbortError
        // non gérées lancées par la librairie quand deux opérations auth se chevauchent.
        // Impact : pas de mutex multi-onglets, acceptable pour cette app.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
      },
    }
  )
}
