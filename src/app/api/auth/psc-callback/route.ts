import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'
import { exchangePscCode, getPscUserInfo, extractRpps, extractCodeProfession, retirerPrefixeEtat } from '@/lib/auth/psc'
import { generateFusionToken } from '@/lib/auth/fusionToken'
import { retryTransientAuth } from '@/lib/supabase/retry'
import { resolveSpecialite } from '@/lib/constants/profil'
import { recalcResultatsPourSolution, ensureSolutionUtilisee } from '@/lib/actions/evaluation'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import { enregistrerIdentitePsc } from '@/lib/annuaire/identite-psc'
import {
  trouverEvaluationsEnAttente, rattacherEvaluationsEnAttente, estRattachee, assurerSuiviFinalise,
  type EvaluationEnAttente,
} from '@/lib/evaluations/en-attente-psc'

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

/** Log non bloquant d'une étape du handoff de session PSC (table `psc_session_events`). */
async function logHandoff(
  admin: ReturnType<typeof createServiceRoleClient>,
  correlationId: string,
  userId: string | null,
  step: string,
  detail?: string,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('psc_session_events').insert({
      correlation_id: correlationId,
      step,
      user_id: userId,
      detail: detail ? detail.slice(0, 500) : null,
    })
  } catch { /* jamais bloquant */ }
}

/**
 * Établit la session PSC CÔTÉ SERVEUR : verifyOtp via le client SSR (adaptateur
 * cookies), de sorte que les cookies de session soient attachés à la redirection.
 * Supprime la dépendance au JS client (/auth/psc-session) qui perdait ~16 % des
 * sessions au retour de l'app mobile PSC. Modèle : src/app/auth/confirm/route.ts.
 */
async function establishPscSession(
  tokenHash: string,
  correlationId: string,
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string | null,
): Promise<boolean> {
  const supabase = await createServerClient()
  const { error } = await retryTransientAuth(() =>
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  )
  await logHandoff(admin, correlationId, userId, error ? 'verify_error' : 'verify_success', error?.message)
  return !error
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
  // Nouveau format (3 parties) : "[dev_|devsite_]stateUuid|userId|verificationToken"  — '_' si absent
  // Ancien format (2 parties) : "[dev_|devsite_]stateUuid|verificationToken"
  let verificationToken: string | null = null
  let stateUserId: string | null = null
  if (state) {
    const stateClean = retirerPrefixeEtat(state)
    const parts = stateClean.split('|')
    if (parts.length >= 3) {
      // Nouveau format 3-part
      const userIdPart = parts[1]
      const tokenPart = parts[2]
      if (userIdPart && userIdPart !== '_') stateUserId = userIdPart
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

  // Protection CSRF : le `state` reçu doit être celui que CE navigateur a demandé (cookie
  // `psc_state` posé au départ par connectWithPsc / psc-initier). Sans ce contrôle, un tiers
  // peut faire aboutir dans le navigateur d'un médecin une connexion qu'il a lancée lui-même.
  // Mesure d'abord (`state_check` : ok / absent / different dans psc_session_events) ; blocage
  // seulement si PSC_ETAT_STRICT=true, une fois vérifié que les retours via l'application e-CPS
  // reviennent bien dans le navigateur de départ (sinon le cookie est absent).
  const cookieStore = await cookies()
  const etatAttendu = cookieStore.get('psc_state')?.value ?? null
  const etatRecu = state ? retirerPrefixeEtat(state).split('|')[0] : null
  const controleEtat = !etatAttendu ? 'absent' : etatAttendu === etatRecu ? 'ok' : 'different'
  cookieStore.delete('psc_state') // usage unique
  cookieStore.delete('psc_nonce')
  await logHandoff(createServiceRoleClient(), crypto.randomUUID(), null, 'state_check', controleEtat)
  if (controleEtat !== 'ok' && process.env.PSC_ETAT_STRICT === 'true') {
    console.warn('[PSC] state refusé :', controleEtat)
    return NextResponse.redirect(`${origin}/connexion?error=psc_state`)
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
    const infosPsc = { rpps, codeProfession, nom, prenom, specialiteCode }

    // Le compte à associer vient du `state`, donc de l'URL : n'importe qui peut l'écrire.
    // On ne l'accepte que s'il est celui de la session du navigateur ; sinon, connexion PSC
    // standard (par RPPS). Sans ce contrôle (avant le 2026-10-07), une identité PSC valide
    // et l'UUID d'un compte suffisaient pour se faire ouvrir une session sur ce compte.
    let sessionUserId: string | null = null
    if (stateUserId) {
      const sessionClient = await createServerClient()
      const { data: sessionData } = await retryTransientAuth(() => sessionClient.auth.getUser())
      sessionUserId = sessionData.user?.id ?? null
      if (sessionUserId !== stateUserId) {
        console.warn('[PSC] association ignorée : le compte du state n’est pas celui de la session')
      }
    }
    const currentUserId = stateUserId && sessionUserId === stateUserId ? stateUserId : null

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
      await retryTransientAuth(() =>
        supabaseAdmin.auth.admin.updateUserById(currentUserId, {
          user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
        })
      )
      await enregistrerIdentitePsc(supabaseAdmin, infosPsc, currentUserId)

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
        if (ev.solution_id) {
          await ensureSolutionUtilisee(currentUserId, ev.solution_id)
          await recalcResultatsPourSolution(ev.solution_id)
        }
      }

      // Générer un magic link pour rafraîchir la session avec le profil mis à jour
      const { data: keepProfile } = await supabaseAdmin
        .from('users').select('email').eq('id', currentUserId).single()
      const keepEmail = keepProfile?.email || userEmail
      const { data: linkData, error: linkError } = await retryTransientAuth(() =>
        supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: keepEmail,
        })
      )
      if (linkError || !linkData) {
        return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
      }
      const assocTokenHash = linkData.properties.hashed_token
      const assocCid = crypto.randomUUID()
      await logHandoff(supabaseAdmin, assocCid, currentUserId, 'handoff_start')
      const assocOk = await establishPscSession(assocTokenHash, assocCid, supabaseAdmin, currentUserId)
      if (!assocOk) {
        return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
      }
      return NextResponse.redirect(`${origin}/mon-compte/profil?psc=associe`)
    }

    // 3b. MODE STANDARD : connexion PSC classique (nouveau compte ou reconnexion)
    let userId: string | null = null
    let currentPublicEmail: string | null = null
    let isNewUser = false

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
      isNewUser = true
      const { data: newUser, error: createError } = await retryTransientAuth(() =>
        supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub },
        })
      )

      if (createError || !newUser?.user) {
        // Cas "utilisateur orphelin" : présent dans auth.users mais absent de public.users
        // (typiquement après un premier callback qui a échoué après createUser).
        // On utilise generateLink pour récupérer l'UUID auth existant.
        const { data: recoverLink } = await retryTransientAuth(() =>
          supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: userEmail,
          })
        )
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
      // `const` local : la closure du retry perdrait le narrowing de `userId`
      const uid = userId
      await retryTransientAuth(() =>
        supabaseAdmin.auth.admin.updateUserById(uid, {
          user_metadata: { provider: 'psc', rpps, given_name: prenom, family_name: nom, psc_sub: sub, specialite, mode_exercice: modeExercice },
        })
      )
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
        if (ev.solution_id) {
          await ensureSolutionUtilisee(userId, ev.solution_id)
          await recalcResultatsPourSolution(ev.solution_id)
        }
      }
    }

    if (userId) await enregistrerIdentitePsc(supabaseAdmin, infosPsc, userId)

    // Flux de supervision admin : nouvelle inscription via Pro Santé Connect
    if (isNewUser && userId) {
      await logActivity({
        type: ACTIVITY_TYPES.INSCRIPTION_PSC,
        acteurType: 'medecin',
        acteurId: userId,
        acteurLabel: [prenom, nom].filter(Boolean).join(' ') || rpps || userEmail || null,
        cibleType: 'user',
        cibleId: userId,
        diff: specialite ? { specialite: { avant: null, apres: specialite } } : null,
      })
    }

    // 5. Générer un magic link (consommé par verifyOtp côté serveur à l'étape 8)
    // Pour les utilisateurs existants : utiliser l'email auth.users réel (pas celui retourné par PSC)
    // PSC peut retourner un email différent (ex: email perso) alors que auth.users a l'email synthétique
    // → generateLink avec le mauvais email crée un utilisateur fantôme et établit une session invalide
    let emailForLink = userEmail
    if (!isNewUser && userId) {
      const uid = userId
      const { data: authUserData } = await retryTransientAuth(() =>
        supabaseAdmin.auth.admin.getUserById(uid)
      )
      if (authUserData?.user?.email) emailForLink = authUserData.user.email
    }
    const { data: linkData, error: linkError } = await retryTransientAuth(() =>
      supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: emailForLink,
      })
    )

    if (linkError || !linkData) {
      console.error('[PSC] generateLink error:', linkError)
      return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
    }

    const tokenHash = linkData.properties.hashed_token

    // 6. La session est établie côté serveur à l'étape 8 (establishPscSession) :
    //    verifyOtp via le client SSR pose les cookies sur le NextResponse.redirect.

    // 7. Lier les évaluations anonymes en attente, toutes pistes réunies : jeton du lien,
    //    email PSC, email et contact_email du compte (les comptes PSC ont souvent un email
    //    synthétique @psc.sante.fr, le vrai est dans contact_email).
    //    Avant le 2026-11-12 : première piste fructueuse seulement (les autres évaluations
    //    à la même adresse restaient en attente), et échec silencieux quand le compte avait
    //    déjà un avis sur le logiciel, tout en annonçant « évaluation publiée ».
    const { data: userProfile } = userId
      ? await supabaseAdmin.from('users').select('email, contact_email').eq('id', userId).single()
      : { data: null }
    let evalsALier: EvaluationEnAttente[] = []
    if (userId) {
      try {
        evalsALier = await trouverEvaluationsEnAttente(supabaseAdmin, {
          jeton: verificationToken,
          adresses: [email, userProfile?.email, userProfile?.contact_email],
        })
      } catch (e) {
        // Jamais bloquant pour la connexion : le rattachement sera retenté au chargement du profil.
        console.error('[PSC] recherche des évaluations en attente :', e)
      }
    }

    // Sauvegarder l'email_temp comme contact_email avant de l'effacer
    const emailTempTrouve = evalsALier.find((ev) => ev.email_temp)?.email_temp
    if (userId && emailTempTrouve && !userProfile?.contact_email) {
      await supabaseAdmin.from('users')
        .update({ contact_email: emailTempTrouve })
        .eq('id', userId)
    }

    // Publier les évaluations trouvées (l'identité vient d'être vérifiée par PSC)
    const rattachements = userId && evalsALier.length > 0
      ? await rattacherEvaluationsEnAttente(supabaseAdmin, userId, evalsALier, { publier: true })
      : []
    const evalsRattachees = rattachements.filter(estRattachee)
    // « Évaluation publiée » n'est annoncé que si une évaluation l'a réellement été.
    const evaluationLiee = evalsRattachees.length > 0

    // Créer ou mettre à jour solutions_utilisees (nécessaire pour l'affichage dans mon compte)
    for (const ev of evalsRattachees) {
      if (ev.solutionId && userId) {
        await assurerSuiviFinalise(supabaseAdmin, userId, ev.solutionId, ev.scores)
        await recalcResultatsPourSolution(ev.solutionId)
      }
    }

    // 8. Déterminer la destination selon l'état du profil, établir la session, rediriger
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_complete')
      .eq('id', userId)
      .single()

    const next = !profile?.is_complete
      ? (evaluationLiee ? '/completer-profil?evaluation=publiee' : '/completer-profil')
      : evaluationLiee
        ? '/mon-compte/mes-evaluations?evaluation=publiee'
        : '/mon-compte/profil'

    // Établir la session côté serveur puis rediriger directement vers la destination.
    // Plus de roundtrip client (/auth/psc-session) : la session ne dépend plus de
    // l'exécution du JS au retour de l'app mobile PSC (cf. ~16 % d'abandons silencieux).
    const correlationId = crypto.randomUUID()
    await logHandoff(supabaseAdmin, correlationId, userId, 'handoff_start')
    const sessionOk = await establishPscSession(tokenHash, correlationId, supabaseAdmin, userId)
    if (!sessionOk) {
      return NextResponse.redirect(`${origin}/connexion?error=psc_session_error`)
    }
    return NextResponse.redirect(`${origin}${next}`)

  } catch (err) {
    console.error('[PSC] callback exception:', err)
    return NextResponse.redirect(`${origin}/connexion?error=psc_error`)
  }
}
