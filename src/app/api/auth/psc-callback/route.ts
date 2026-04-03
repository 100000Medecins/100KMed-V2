import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangePscCode, getPscUserInfo, extractRpps } from '@/lib/auth/psc'
import { resolveSpecialite } from '@/lib/constants/profil'

function extractSpecialiteCode(userInfo: Record<string, unknown>): string | null {
  const ref = userInfo.SubjectRefPro as { exercices?: Array<{ codeSavoirFaire?: string; codeTypeSavoirFaire?: string }> } | undefined
  const exercice = ref?.exercices?.[0]
  if (!exercice || exercice.codeTypeSavoirFaire !== 'S') return null
  return exercice.codeSavoirFaire ?? null
}

function extractModeExercice(userInfo: Record<string, unknown>): string | null {
  const ref = userInfo.SubjectRefPro as { exercices?: Array<{ activities?: Array<{ codeModeExercice?: string }> }> } | undefined
  const code = ref?.exercices?.[0]?.activities?.[0]?.codeModeExercice
  const map: Record<string, string> = { L: 'Libéral', S: 'Salarié', B: 'Bénévole' }
  return map[code ?? ''] ?? null
}

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
  const state = searchParams.get('state')

  // Extraire le token de vérification depuis le state (format "stateUuid|token")
  let verificationToken: string | null = null
  if (state && state.includes('|')) {
    verificationToken = state.split('|')[1] || null
  }

  if (error || !code) {
    console.error('[PSC] callback error:', error || 'no code')
    return NextResponse.redirect(`${origin}/connexion?error=psc_auth_error`)
  }

  try {
    // 1. Échanger le code contre des tokens
    const tokens = await exchangePscCode(code, origin)

    // 2. Récupérer les infos utilisateur
    const userInfo = await getPscUserInfo(tokens.access_token)
    console.log('[PSC] userInfo complet:', JSON.stringify(userInfo, null, 2))

    const rpps = extractRpps(userInfo)
    const email = userInfo.email || null
    const nom = userInfo.family_name || null
    const prenom = userInfo.given_name || null
    const sub = userInfo.sub
    const specialiteCode = extractSpecialiteCode(userInfo)
    const specialite = resolveSpecialite(specialiteCode)
    const modeExercice = extractModeExercice(userInfo)

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
        specialite,
        mode_exercice: modeExercice,
      })
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub, specialite, mode_exercice: modeExercice },
      })
      // Mettre à jour le profil avec les données PSC fraîches
      await supabaseAdmin.from('users').update({ nom, prenom, specialite, mode_exercice: modeExercice }).eq('id', userId)
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

    // 7. Lier les évaluations anonymes en attente
    let evaluationLiee = false

    // Par token de vérification (chemin direct depuis le lien email)
    if (verificationToken) {
      const { data: evalParToken } = await supabaseAdmin
        .from('evaluations')
        .select('id')
        .eq('token_verification', verificationToken)
        .eq('statut', 'en_attente_psc')
        .limit(1)

      if (evalParToken && evalParToken.length > 0) {
        await supabaseAdmin
          .from('evaluations')
          .update({ statut: 'publiee', user_id: userId, email_temp: null, token_verification: null })
          .eq('token_verification', verificationToken)
          .eq('statut', 'en_attente_psc')
        evaluationLiee = true
      }
    }

    // Par email PSC (filet si le token n'est pas dans le state)
    if (!evaluationLiee && email) {
      const { data: evalParEmail } = await supabaseAdmin
        .from('evaluations')
        .select('id')
        .eq('email_temp', email.toLowerCase())
        .eq('statut', 'en_attente_psc')
        .limit(1)

      if (evalParEmail && evalParEmail.length > 0) {
        await supabaseAdmin
          .from('evaluations')
          .update({ statut: 'publiee', user_id: userId, email_temp: null, token_verification: null })
          .eq('email_temp', email.toLowerCase())
          .eq('statut', 'en_attente_psc')
        evaluationLiee = true
      }
    }

    // Par email enregistré dans users (cas : email différent dans le formulaire, même compte PSC via RPPS)
    if (!evaluationLiee) {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      const registeredEmail = userProfile?.email
      if (registeredEmail && (!email || registeredEmail.toLowerCase() !== email.toLowerCase())) {
        await supabaseAdmin
          .from('evaluations')
          .update({ statut: 'publiee', user_id: userId, email_temp: null, token_verification: null })
          .eq('email_temp', registeredEmail.toLowerCase())
          .eq('statut', 'en_attente_psc')
      }
    }

    // 8. Rediriger selon l'état du profil
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_complete')
      .eq('id', userId)
      .single()

    if (!profile?.is_complete) {
      return NextResponse.redirect(`${origin}/completer-profil`)
    }

    if (evaluationLiee) {
      return NextResponse.redirect(`${origin}/mon-compte/mes-evaluations?evaluation=publiee`)
    }

    return NextResponse.redirect(`${origin}/mon-compte/mes-evaluations`)

  } catch (err) {
    console.error('[PSC] callback exception:', err)
    return NextResponse.redirect(`${origin}/connexion?error=psc_error`)
  }
}
