import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangePscCode, getPscUserInfo, extractRpps } from '@/lib/auth/psc'

/**
 * GET /api/auth/psc-callback
 *
 * Callback PSC : reçoit le code d'autorisation, échange contre des tokens,
 * crée/connecte l'utilisateur dans Supabase, et redirige.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    console.error('[PSC] callback error:', error || 'no code')
    return NextResponse.redirect(`${origin}/connexion?error=psc_auth_error`)
  }

  try {
    // 1. Échanger le code contre des tokens
    const tokens = await exchangePscCode(code, origin)

    // 2. Récupérer les infos utilisateur
    const userInfo = await getPscUserInfo(tokens.access_token)
    const rpps = extractRpps(userInfo)
    const email = userInfo.email || null
    const nom = userInfo.family_name || null
    const prenom = userInfo.given_name || null
    const sub = userInfo.sub

    if (!rpps && !sub) {
      console.error('[PSC] ni RPPS ni sub dans userInfo', userInfo)
      return NextResponse.redirect(`${origin}/connexion?error=psc_no_identity`)
    }

    const supabaseAdmin = createServiceRoleClient()
    const userEmail = email || `psc-${rpps || sub}@psc.sante.fr`

    // 3. Chercher un utilisateur existant par RPPS
    let userId: string | null = null

    if (rpps) {
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('rpps', rpps)
        .single()
      if (existingProfile) userId = existingProfile.id
    }

    // Sinon chercher par email réel
    if (!userId && email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      if (existingByEmail) userId = existingByEmail.id
    }

    // 4. Créer l'utilisateur si inexistant
    if (!userId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
      })

      if (createError || !newUser.user) {
        console.error('[PSC] createUser error:', createError)
        return NextResponse.redirect(`${origin}/connexion?error=psc_create_error`)
      }

      userId = newUser.user.id

      await supabaseAdmin.from('users').insert({
        id: userId,
        email: userEmail,
        rpps,
        nom,
        prenom,
      })
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
      })
    }

    // 5. Générer un magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    })

    if (linkError || !linkData) {
      console.error('[PSC] generateLink error:', linkError)
      return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
    }

    // 6. Vérifier le OTP côté serveur pour créer la session avec cookies
    const tokenHash = linkData.properties.hashed_token
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    })

    if (verifyError) {
      console.error('[PSC] verifyOtp error:', verifyError)
      return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
    }

    // 7. Rediriger selon l'état du profil
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_complete')
      .eq('id', userId)
      .single()

    if (!profile?.is_complete) {
      return NextResponse.redirect(`${origin}/completer-profil`)
    }

    return NextResponse.redirect(`${origin}/mon-compte/mes-evaluations`)

  } catch (err) {
    console.error('[PSC] callback exception:', err)
    return NextResponse.redirect(`${origin}/connexion?error=psc_error`)
  }
}
