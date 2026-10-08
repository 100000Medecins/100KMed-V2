import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { roleDepuisJeton } from '@/lib/auth/admin-session'
import { ACCUEIL_PAR_ROLE, cheminAutorise } from '@/lib/auth/admin-rubriques'

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) return gardeAdmin(request)
  return await updateSession(request)
}

// Rôle « contenus » : hors de ses rubriques, renvoi vers sa page d'accueil. Toute nouvelle
// page d'admin lui est donc fermée par défaut. Sans session, le layout affiche la connexion.
function gardeAdmin(request: NextRequest) {
  const role = roleDepuisJeton(request.cookies.get('admin_token')?.value)
  if (role && !cheminAutorise(role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(ACCUEIL_PAR_ROLE[role], request.url))
  }
  return NextResponse.next()
}

// Limiter le proxy aux routes qui nécessitent l'auth Supabase, et aux pages d'admin.
// Les pages statiques et publiques ne passent plus par le proxy.
export const config = {
  matcher: [
    '/mon-compte/:path*',
    '/annuaire/:path*',
    '/solution/noter/:path*',
    '/api/auth/:path*',
    '/connexion',
    '/inscription',
    '/admin/:path*',
  ],
}
