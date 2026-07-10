import { createServerClient as _createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Crée un client Supabase côté serveur (Server Components / Server Actions).
 * Utilise l'anon key — soumis aux policies RLS.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Crée un client Supabase admin (service_role) pour les fetches serveur.
 * Bypass RLS — à utiliser uniquement côté serveur pour les données publiques.
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Client Supabase pour les LECTURES PUBLIQUES sur pages cacheables (ISR).
 *
 * Clé anon, mais SANS adaptateur cookies → n'appelle jamais `cookies()`, donc
 * n'oblige pas Next.js à rendre la page dynamiquement (contrairement à
 * `createServerClient()`). C'est ce qui permet à l'ISR de s'activer sur les pages
 * publiques (fiches solutions, accueil, catégories…) → rendu ~1×/heure au lieu de
 * chaque requête, d'où une forte baisse de la CPU Vercel Fluid.
 *
 * La RLS reste active (rôle anon = ne voit que les lignes publiques), donc même
 * vue qu'un visiteur anonyme + filet de sécurité si un filtre `actif` manquait.
 *
 * ⚠️ NE JAMAIS l'utiliser pour du contenu spécifique-utilisateur (mes évals,
 * favoris, profil…) : ça nécessite la session → `createServerClient()`.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

