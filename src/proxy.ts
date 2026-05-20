import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// Limiter le proxy aux routes qui nécessitent l'auth Supabase.
// Les pages statiques et publiques ne passent plus par le proxy.
export const config = {
  matcher: [
    '/mon-compte/:path*',
    '/solution/noter/:path*',
    '/api/auth/:path*',
    '/connexion',
    '/inscription',
  ],
}
