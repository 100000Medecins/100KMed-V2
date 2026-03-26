import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Callback OAuth pour Supabase Auth (PSC + email).
 * Cette route est appelée après l'authentification via le provider OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Vérifier si le profil utilisateur existe dans la table users
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, is_complete')
          .eq('id', user.id)
          .single()

        // Créer le profil si inexistant (premier login)
        if (!profile) {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            rpps: user.user_metadata?.preferred_username || null,
            nom: user.user_metadata?.family_name || null,
            prenom: user.user_metadata?.given_name || null,
            specialite: user.user_metadata?.specialite || null,
          })
          // Nouveau profil → compléter le profil
          return NextResponse.redirect(`${origin}/completer-profil`)
        }

        // Profil existant mais incomplet → compléter le profil
        if (!profile.is_complete) {
          return NextResponse.redirect(`${origin}/completer-profil`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // En cas d'erreur, rediriger vers la page de connexion avec un message
  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
