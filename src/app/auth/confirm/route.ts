import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
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

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, is_complete')
          .eq('id', user.id)
          .single()

        if (!profile) {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            rpps: user.user_metadata?.preferred_username || null,
            nom: user.user_metadata?.family_name || null,
            prenom: user.user_metadata?.given_name || null,
            specialite: user.user_metadata?.specialite || null,
            ...(user.email?.endsWith('@digitalmedicalhub.com') ? { role: 'digital_medical_hub' } : {}),
          })
          return NextResponse.redirect(`${origin}/completer-profil`)
        }

        if (!profile.is_complete) {
          return NextResponse.redirect(`${origin}/completer-profil`)
        }
      }

      return NextResponse.redirect(`${origin}/mon-compte/profil`)
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
