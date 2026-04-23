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

  // Extraire le token de vérification depuis le state.
  // Format possible : "stateUuid|token" ou "dev_stateUuid|token" (mode relay)
  // On strip le préfixe "dev_" avant de parser.
  let verificationToken: string | null = null
  if (state) {
    const stateClean = state.startsWith('dev_') ? state.substring(4) : state
    if (stateClean.includes('|')) verificationToken = stateClean.split('|')[1] || null
  }

  if (error || !code) {
    console.error('[PSC] callback error:', error || 'no code')
    return NextResponse.redirect(`${origin}/connexion?error=psc_auth_error`)
  }

  try {
    // 1. Échanger le code contre des tokens.
    // CRITIQUE : redirect_uri doit être identique à celle envoyée lors de la demande
    // d'autorisation. En mode relay, c'est NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI
    // (https://www.100000medecins.org/connexionPsc). En mode direct, c'est origin + /api/auth/psc-callback.
    const relayRedirectUri = process.env.NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI
    const callbackRedirectUri = relayRedirectUri ?? `${origin}/api/auth/psc-callback`
    const tokens = await exchangePscCode(code, callbackRedirectUri)

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
    let currentPublicEmail: string | null = null

    if (rpps) {
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('rpps', rpps)
        .single()
      if (existingProfile) {
        userId = existingProfile.id
        currentPublicEmail = existingProfile.email ?? null
      }
    }

    // Sinon chercher par email réel
    if (!userId && email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single()
      if (existingByEmail) {
        userId = existingByEmail.id
        currentPublicEmail = existingByEmail.email ?? null
      }
    }

    // 4. Créer l'utilisateur si inexistant
    if (!userId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
      })

      if (createError || !newUser?.user) {
        // Cas "utilisateur orphelin" : présent dans auth.users mais absent de public.users
        // (typiquement après un premier callback qui a échoué après createUser).
        // On utilise generateLink pour récupérer l'UUID auth existant.
        const { data: recoverLink } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: userEmail,
        })
        const recoveredId = recoverLink?.user?.id
        if (!recoveredId) {
          console.error('[PSC] createUser error (unrecoverable):', createError)
          return NextResponse.redirect(`${origin}/connexion?error=psc_create_error`)
        }
        userId = recoveredId
        // Créer le profil public manquant si nécessaire
        const { data: existingPublicRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', userId)
          .single()
        if (!existingPublicRow) {
          await supabaseAdmin.from('users').insert({
            id: userId,
            email: userEmail,
            rpps,
            nom,
            prenom,
            specialite,
            mode_exercice: modeExercice,
            ...(userEmail?.endsWith('@digitalmedicalhub.com') ? { role: 'digital_medical_hub' } : {}),
          })
        }
      } else {
        userId = newUser.user.id
        await supabaseAdmin.from('users').insert({
          id: userId,
          email: userEmail,
          rpps,
          nom,
          prenom,
          specialite,
          mode_exercice: modeExercice,
          ...(userEmail?.endsWith('@digitalmedicalhub.com') ? { role: 'digital_medical_hub' } : {}),
        })
      }
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub, specialite, mode_exercice: modeExercice },
      })
      // Mettre à jour le profil avec les données PSC fraîches
      // N'écraser nom/prenom que si PSC les fournit (évite d'effacer des valeurs saisies manuellement)
      const profileUpdates: Record<string, unknown> = {}
      if (nom) profileUpdates.nom = nom
      if (prenom) profileUpdates.prenom = prenom
      if (specialite) profileUpdates.specialite = specialite
      if (modeExercice) profileUpdates.mode_exercice = modeExercice
      // Corriger l'email fictif généré en bac à sable PSC (@psc.sante.fr ou null)
      // dès que PSC fournit un vrai email (cas typique en PSC production)
      const hasFakeEmail = !currentPublicEmail || currentPublicEmail.endsWith('@psc.sante.fr')
      if (hasFakeEmail && email) profileUpdates.email = email
      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin.from('users').update(profileUpdates).eq('id', userId)
      }
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
    let evalsALier: Array<{ id: string; solution_id: string | null }> = []

    // Par token de vérification (chemin direct depuis le lien email)
    if (verificationToken) {
      const { data } = await supabaseAdmin
        .from('evaluations')
        .select('id, solution_id, email_temp')
        .eq('token_verification', verificationToken)
        .eq('statut', 'en_attente_psc')
      if (data && data.length > 0) evalsALier = data
    }

    // Par email PSC (filet si le token n'est pas dans le state)
    if (evalsALier.length === 0 && email) {
      const { data } = await supabaseAdmin
        .from('evaluations')
        .select('id, solution_id, email_temp')
        .eq('email_temp', email.toLowerCase())
        .eq('statut', 'en_attente_psc')
      if (data && data.length > 0) evalsALier = data
    }

    // Par email enregistré dans users
    if (evalsALier.length === 0) {
      const { data: userProfile } = await supabaseAdmin
        .from('users').select('email').eq('id', userId).single()
      const registeredEmail = userProfile?.email
      if (registeredEmail) {
        const { data } = await supabaseAdmin
          .from('evaluations')
          .select('id, solution_id, email_temp')
          .eq('email_temp', registeredEmail.toLowerCase())
          .eq('statut', 'en_attente_psc')
        if (data && data.length > 0) evalsALier = data
      }
    }

    // Sauvegarder l'email_temp comme contact_email avant de l'effacer
    const emailTempTrouve = (evalsALier as Array<{ email_temp?: string | null }>)[0]?.email_temp
    if (emailTempTrouve) {
      const { data: existingProfile } = await supabaseAdmin
        .from('users').select('contact_email').eq('id', userId).single()
      if (!existingProfile?.contact_email) {
        await supabaseAdmin.from('users')
          .update({ contact_email: emailTempTrouve })
          .eq('id', userId)
      }
    }

    // Publier toutes les évaluations trouvées + créer solutions_utilisees
    const evaluationLiee = evalsALier.length > 0
    for (const ev of evalsALier) {
      await supabaseAdmin
        .from('evaluations')
        .update({ statut: 'publiee', user_id: userId, email_temp: null, token_verification: null })
        .eq('id', ev.id)

      // Créer solutions_utilisees si elle n'existe pas (nécessaire pour l'affichage dans mon compte)
      if (ev.solution_id) {
        const { data: existingSU } = await supabaseAdmin
          .from('solutions_utilisees')
          .select('id')
          .eq('solution_id', ev.solution_id)
          .eq('user_id', userId)
          .limit(1)

        if (!existingSU || existingSU.length === 0) {
          await supabaseAdmin.from('solutions_utilisees').insert({
            user_id: userId,
            solution_id: ev.solution_id,
            statut_evaluation: 'finalisee',
            date_debut: new Date().toISOString().split('T')[0],
          })
        }
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
      return NextResponse.redirect(`${origin}/mon-compte/profil?evaluation=publiee`)
    }

    return NextResponse.redirect(`${origin}/mon-compte/profil`)

  } catch (err) {
    console.error('[PSC] callback exception:', err)
    return NextResponse.redirect(`${origin}/connexion?error=psc_error`)
  }
}
