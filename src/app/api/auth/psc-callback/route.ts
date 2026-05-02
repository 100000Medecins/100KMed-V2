import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangePscCode, getPscUserInfo, extractRpps, extractCodeProfession } from '@/lib/auth/psc'
import { generateFusionToken } from '@/lib/auth/fusionToken'
import { resolveSpecialite } from '@/lib/constants/profil'
import { recalcResultatsPourSolution } from '@/lib/actions/evaluation'

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

  // Parser le state.
  // Nouveau format (3 parties) : "[dev_]stateUuid|userId|verificationToken"  — '_' si absent
  // Ancien format (2 parties) : "[dev_]stateUuid|verificationToken"
  let verificationToken: string | null = null
  let currentUserId: string | null = null
  if (state) {
    const stateClean = state.startsWith('dev_') ? state.substring(4) : state
    const parts = stateClean.split('|')
    if (parts.length >= 3) {
      // Nouveau format 3-part
      const userIdPart = parts[1]
      const tokenPart = parts[2]
      if (userIdPart && userIdPart !== '_') currentUserId = userIdPart
      if (tokenPart && tokenPart !== '_') verificationToken = tokenPart
    } else if (parts.length === 2) {
      // Ancien format 2-part : stateUuid|verificationToken
      verificationToken = parts[1] || null
    }
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
    const codeProfession = extractCodeProfession(userInfo)

    if (!rpps && !sub) {
      console.error('[PSC] ni RPPS ni sub dans userInfo', userInfo)
      return NextResponse.redirect(`${origin}/connexion?error=psc_no_identity`)
    }

    // Restreindre aux médecins uniquement (code profession "10")
    // Ne bloquer que si PSC fournit explicitement un code différent de "10"
    if (codeProfession && codeProfession !== '10') {
      console.warn('[PSC] profession non médecin refusée:', codeProfession)
      return NextResponse.redirect(`${origin}/connexion?error=psc_non_medecin`)
    }

    const supabaseAdmin = createServiceRoleClient()
    const userEmail = email || `psc-${rpps || sub}@psc.sante.fr`

    // 3a. MODE ASSOCIATION : l'utilisateur était déjà connecté en email/mdp et a cliqué
    //     sur le bouton PSC depuis son compte. currentUserId est son UUID session actuel.
    if (currentUserId) {
      // Vérifier si ce RPPS appartient déjà à un autre compte
      if (rpps) {
        const { data: rppsProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('rpps', rpps)
          .single()

        if (rppsProfile && rppsProfile.id !== currentUserId) {
          // FUSION : deux comptes distincts pour le même RPPS → rediriger
          const fusionToken = generateFusionToken(currentUserId, rppsProfile.id)
          return NextResponse.redirect(
            `${origin}/fusionner-compte?token=${encodeURIComponent(fusionToken)}`
          )
        }
      }

      // Pas de conflit : associer le RPPS + données PSC au compte existant
      const profileUpdates: Record<string, unknown> = {}
      if (rpps) profileUpdates.rpps = rpps
      if (nom) profileUpdates.nom = nom
      if (prenom) profileUpdates.prenom = prenom
      if (specialite) profileUpdates.specialite = specialite
      if (modeExercice) profileUpdates.mode_exercice = modeExercice
      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin.from('users').update(profileUpdates).eq('id', currentUserId)
      }
      await supabaseAdmin.auth.admin.updateUserById(currentUserId, {
        user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
      })

      // Publier les évaluations en attente de PSC pour cet utilisateur
      const { data: pendingAssoc } = await supabaseAdmin
        .from('evaluations')
        .select('solution_id')
        .eq('user_id', currentUserId)
        .eq('statut', 'en_attente_psc')
      await supabaseAdmin
        .from('evaluations')
        .update({ statut: 'publiee' })
        .eq('user_id', currentUserId)
        .eq('statut', 'en_attente_psc')
      for (const ev of pendingAssoc ?? []) {
        if (ev.solution_id) await recalcResultatsPourSolution(ev.solution_id)
      }

      // Générer un magic link pour rafraîchir la session avec le profil mis à jour
      const { data: keepProfile } = await supabaseAdmin
        .from('users').select('email').eq('id', currentUserId).single()
      const keepEmail = keepProfile?.email || userEmail
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: keepEmail,
      })
      if (linkError || !linkData) {
        return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
      }
      const assocTokenHash = linkData.properties.hashed_token
      return NextResponse.redirect(
        `${origin}/auth/psc-session?token=${assocTokenHash}&next=${encodeURIComponent('/mon-compte/profil?psc=associe')}`
      )
    }

    // 3b. MODE STANDARD : connexion PSC classique (nouveau compte ou reconnexion)
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
      if (rpps) profileUpdates.rpps = rpps
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

      // Publier les évaluations en_attente_psc liées à ce user_id
      // (cas : compte email/mdp existant qui se connecte via PSC pour la première fois)
      const { data: pendingExisting } = await supabaseAdmin
        .from('evaluations')
        .select('solution_id')
        .eq('user_id', userId)
        .eq('statut', 'en_attente_psc')
      await supabaseAdmin
        .from('evaluations')
        .update({ statut: 'publiee' })
        .eq('user_id', userId)
        .eq('statut', 'en_attente_psc')
      for (const ev of pendingExisting ?? []) {
        if (ev.solution_id) await recalcResultatsPourSolution(ev.solution_id)
      }
    }

    // 5. Générer un magic link (le verifyOtp se fera côté client via /auth/psc-session)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    })

    if (linkError || !linkData) {
      console.error('[PSC] generateLink error:', linkError)
      return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
    }

    const tokenHash = linkData.properties.hashed_token

    // 6. (Supprimé) verifyOtp côté serveur — les cookies de session ne peuvent pas
    // être attachés à un NextResponse.redirect() dans un Route Handler Next.js.
    // On délègue au client via /auth/psc-session.

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

    // Par email ou contact_email enregistrés dans users
    // (strategies 3+4 fusionnées : nécessaire car les comptes PSC ont un email synthétique
    // @psc.sante.fr qui ne correspondra jamais à email_temp — contact_email contient le vrai email)
    if (evalsALier.length === 0) {
      const { data: userProfile } = await supabaseAdmin
        .from('users').select('email, contact_email').eq('id', userId).single()
      for (const lookupEmail of [userProfile?.email, userProfile?.contact_email]) {
        if (!lookupEmail || evalsALier.length > 0) continue
        const { data } = await supabaseAdmin
          .from('evaluations')
          .select('id, solution_id, email_temp')
          .eq('email_temp', lookupEmail.toLowerCase())
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

        await recalcResultatsPourSolution(ev.solution_id)
      }
    }

    // 8. Rediriger vers /auth/psc-session pour établir la session côté client
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_complete')
      .eq('id', userId)
      .single()

    const next = !profile?.is_complete
      ? '/completer-profil'
      : evaluationLiee
        ? '/mon-compte/profil?evaluation=publiee'
        : '/mon-compte/profil'

    return NextResponse.redirect(
      `${origin}/auth/psc-session?token=${tokenHash}&next=${encodeURIComponent(next)}`
    )

  } catch (err) {
    console.error('[PSC] callback exception:', err)
    return NextResponse.redirect(`${origin}/connexion?error=psc_error`)
  }
}
