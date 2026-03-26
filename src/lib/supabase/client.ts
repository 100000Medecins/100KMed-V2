import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Crée un client Supabase côté navigateur (Client Components).
 * Le generic Database permet l'autocomplétion TypeScript sur les tables.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
