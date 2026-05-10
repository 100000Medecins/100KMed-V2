import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { recalcResultatsPourSolution } from '@/lib/actions/evaluation'

/**
 * Callback Auth pour Supabase — gère deux formats :
 * - `code`        : PKCE flow (OAuth, PSC) → exchangeCodeForSession
 * - `token_hash`  : email confirmation → verifyOtp
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

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

  let sessionError: Error | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    sessionError = error
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    sessionError = error
  }

  if (!sessionError) {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      if (type === 'email_change' && user.email) {
        await supabase.from('users').update({ email: user.email, contact_email: user.email }).eq('id', user.id)
      }

      if (type === 'signup' && user.email) {
        const adminSupabase = createServiceRoleClient()
        const { data: pendingEvals } = await adminSupabase
          .from('evaluations')
          .select('id, solution_id')
          .eq('email_temp', user.email.toLowerCase())
          .eq('statut', 'en_attente_psc')
        if (pendingEvals && pendingEvals.length > 0) {
          await adminSupabase
            .from('evaluations')
            .update({ user_id: user.id, statut: 'publiee', email_temp: null, token_verification: null })
            .eq('email_temp', user.email.toLowerCase())
            .eq('statut', 'en_attente_psc')
          for (const ev of pendingEvals) {
            if (ev.solution_id) await recalcResultatsPourSolution(ev.solution_id)
          }
        }
      }

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

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_error`)
}
