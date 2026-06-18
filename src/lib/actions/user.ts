'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { buildEmail } from '@/lib/actions/emailTemplates'
import { generateFusionToken } from '@/lib/auth/fusionToken'
import { generateConfirmToken } from '@/lib/email/confirm-token'
import { generateResetToken, verifyResetToken } from '@/lib/email/reset-token'
import { verifyTurnstileToken } from '@/lib/turnstile'
import sgMail from '@sendgrid/mail'
import sharp from 'sharp'

/**
 * Envoie un email de réinitialisation de mot de passe via SendGrid.
 *
 * Le lien est un HMAC maison idempotent (rejouable) — pas le token OTP Supabase
 * à usage unique : le pré-scan du lien par les clients mail / antivirus ne le
 * « consomme » plus. Le GET du lien n'affiche que le formulaire ; c'est le POST
 * (resetPasswordWithToken) qui modifie réellement le mot de passe.
 */
export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient()

  // Résoudre l'uid depuis l'email. Silencieux si inconnu (on ne révèle pas l'existence d'un compte).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!profile?.id) return { error: null }

  const headersList = await headers()
  const host = headersList.get('host') || 'www.100000medecins.org'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `${proto}://${host}`

  const { iat, token } = generateResetToken(profile.id as string)
  const resetLink = `${siteUrl}/reinitialiser-mot-de-passe?uid=${profile.id}&iat=${iat}&token=${token}`

  const emailContent = await buildEmail(
    'reinitialisation_mot_de_passe',
    { lien_reinitialisation: resetLink },
    siteUrl
  )
  if (!emailContent) return { error: 'Template email introuvable' }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: email,
      from: 'contact@100000medecins.org',
      subject: emailContent.sujet,
      html: emailContent.html,
    })
  } catch {
    return { error: 'Erreur lors de l\'envoi de l\'email.' }
  }

  return { error: null }
}

/**
 * Réinitialise le mot de passe à partir d'un lien HMAC valide.
 * Re-vérifie le HMAC côté serveur (on ne fait jamais confiance au client).
 */
export async function resetPasswordWithToken(
  uid: string,
  iat: number,
  token: string,
  newPassword: string
): Promise<{ error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Le mot de passe doit contenir au moins 6 caractères.' }
  }
  const verdict = verifyResetToken(uid, iat, token)
  if (verdict === 'expired') {
    return { error: 'Le lien a expiré. Demandez un nouveau lien de réinitialisation.' }
  }
  if (verdict === 'invalid') {
    return { error: 'Lien invalide. Demandez un nouveau lien de réinitialisation.' }
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(uid, { password: newPassword })
  if (error) {
    if (error.message?.toLowerCase().includes('different from the old')) {
      return { error: 'Le nouveau mot de passe doit être différent de l\'ancien.' }
    }
    return { error: 'Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.' }
  }
  return { error: null }
}

/**
 * Récupère le profil complet de l'utilisateur connecté depuis la table users.
 */
export async function getCurrentUserProfile() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('users')
    .select('nom, prenom, specialite, mode_exercice, pseudo, contact_email, rpps, portrait')
    .eq('id', user.id)
    .single()

  return data
}

/**
 * Vérifie si un email est déjà associé à un compte dans public.users.
 * Utilise le service role pour voir toutes les lignes (pas de filtrage RLS).
 * Note : expose intentionnellement l'existence d'un email (tradeoff UX accepté).
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  // auth.users.email est stocké en minuscules par GoTrue, mais la RPC fait un match exact
  // sensible à la casse. On normalise l'entrée pour éviter les faux « compte introuvable »
  // quand l'utilisateur tape une casse différente (ex. mobile en auto-majuscule).
  const normalized = email.trim().toLowerCase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc('check_auth_email_exists', { p_email: normalized })
  return !!data
}

/**
 * Crée le profil public.users après l'inscription email.
 * Utilise le service role car l'utilisateur n'a pas encore de session active
 * (email non confirmé) et le RLS bloquerait l'insertion.
 */
export async function createUserProfile(userId: string, email: string) {
  const supabase = createServiceRoleClient()

  // Vérifier que l'utilisateur existe bien dans auth.users
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  if (!authUser?.user) throw new Error('Utilisateur introuvable')

  // Vérifier si le profil existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existing) {
    await supabase.from('users').insert({
      id: userId,
      email,
      ...(email?.endsWith('@digitalmedicalhub.com') ? { role: 'digital_medical_hub' } : {}),
    })
  }

  return { status: 'SUCCESS' }
}

/**
 * Construit le lien de confirmation HMAC et envoie l'email `confirmation_inscription`
 * via SendGrid. Partagé entre l'inscription initiale (`registerWithEmail`) et le
 * renvoi manuel (`resendConfirmationEmail`).
 * Lève si l'envoi SendGrid échoue ; renvoie `false` si le template ou la clé manque.
 */
async function sendConfirmationEmail(
  userId: string,
  email: string,
  signupType?: string
): Promise<boolean> {
  const headersList = await headers()
  const host = headersList.get('host') || 'www.100000medecins.org'
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `${proto}://${host}`

  const { iat, token } = generateConfirmToken(userId)
  const typeSuffix = signupType === 'editeur' ? '&type=editeur' : ''
  const lienConfirmation = `${siteUrl}/auth/confirm-email?uid=${userId}&iat=${iat}&token=${token}${typeSuffix}`

  const emailContent = await buildEmail('confirmation_inscription', { lien_confirmation: lienConfirmation }, siteUrl)
  if (!emailContent) {
    console.error('[sendConfirmationEmail] template "confirmation_inscription" introuvable en BDD — email NON envoyé')
    return false
  }
  if (!process.env.SENDGRID_API_KEY) {
    console.error('[sendConfirmationEmail] SENDGRID_API_KEY absente — email NON envoyé')
    return false
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  await sgMail.send({
    to: email,
    from: 'contact@100000medecins.org',
    subject: emailContent.sujet,
    html: emailContent.html,
  })
  return true
}

/**
 * Inscription email/mot de passe avec confirmation par lien HMAC idempotent.
 *
 * Remplace `supabase.auth.signUp()` : on crée le compte via l'API admin
 * (email_confirm: false, donc PAS d'email natif Supabase), puis on envoie
 * notre propre email avec un lien de confirmation rejouable à l'infini.
 * Ainsi le pré-scan du lien par les clients mail / antivirus ne « consomme »
 * plus rien — fini le faux message d'erreur de confirmation.
 */
export async function registerWithEmail(input: {
  email: string
  password: string
  elapsedMs?: number
  signupType?: string
  turnstileToken?: string
}): Promise<{ status: 'SUCCESS' } | { status: 'EMAIL_EXISTS' } | { status: 'ERROR'; message: string }> {
  // Garde-fou anti-bot : un humain met plusieurs secondes à saisir email + mot de passe.
  // Une soumission quasi instantanée = bot → faux succès silencieux (on ne crée rien).
  // Pas de faux positif possible (contrairement au honeypot déclenché par les password managers).
  if (typeof input.elapsedMs === 'number' && input.elapsedMs < 2500) {
    return { status: 'SUCCESS' }
  }

  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email || !email.includes('@')) return { status: 'ERROR', message: 'Adresse email invalide.' }
  if (!password || password.length < 6) {
    return { status: 'ERROR', message: 'Le mot de passe doit contenir au moins 6 caractères.' }
  }

  // Vérification anti-bot Cloudflare Turnstile.
  // No-op si TURNSTILE_SECRET_KEY n'est pas configurée (dégradation gracieuse).
  if (!(await verifyTurnstileToken(input.turnstileToken))) {
    return { status: 'ERROR', message: 'Vérification anti-robot échouée. Merci de réessayer.' }
  }

  const supabase = createServiceRoleClient()

  // Création du compte SANS email natif (email_confirm: false)
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  })

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('registered') || createError.status === 422) {
      return { status: 'EMAIL_EXISTS' }
    }
    return { status: 'ERROR', message: createError.message }
  }

  const userId = created.user?.id
  if (!userId) return { status: 'ERROR', message: 'La création du compte a échoué. Veuillez réessayer.' }

  // Profil public.users (gère le rôle digital_medical_hub si email @digitalmedicalhub.com)
  try {
    await createUserProfile(userId, email)
  } catch (e) {
    console.error('[registerWithEmail] createUserProfile failed:', e)
  }

  // Envoi de l'email de confirmation HMAC idempotent (best-effort)
  try {
    const sent = await sendConfirmationEmail(userId, email, input.signupType)
    if (sent) console.log('[registerWithEmail] email de confirmation envoyé à', email)
  } catch (e) {
    console.error('[registerWithEmail] email send failed:', e)
    // Le compte est créé ; si l'email échoue, l'utilisateur pourra demander un renvoi.
  }

  return { status: 'SUCCESS' }
}

/**
 * Renvoie l'email de confirmation d'inscription (lien HMAC idempotent).
 * Déclenché par le bouton « Renvoyer » de l'écran de succès d'inscription.
 * Silencieux si l'email est inconnu (on ne révèle pas l'existence d'un compte).
 */
export async function resendConfirmationEmail(
  email: string,
  signupType?: string
): Promise<{ ok: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail.includes('@')) return { ok: false }

  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle()
  if (!profile?.id) return { ok: true } // silencieux : on ne révèle pas l'existence d'un compte

  try {
    await sendConfirmationEmail(profile.id as string, cleanEmail, signupType)
  } catch (e) {
    console.error('[resendConfirmationEmail] send failed:', e)
    return { ok: false }
  }
  return { ok: true }
}

/**
 * Complète le profil utilisateur après la première inscription.
 * Utilise le service role pour bypasser le RLS.
 */
export async function completeProfile(data: {
  nom: string
  prenom: string
  specialite: string
  mode_exercice: string
  contact_email: string
  pseudo?: string
  portrait?: string
  password?: string
}): Promise<{ status: 'SUCCESS' } | { status: 'FUSION_EMAIL_SENT'; email: string }> {
  const authClient = await createServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const supabase = createServiceRoleClient()

  // Détection de conflit d'email : si l'utilisateur veut passer son email auth vers une
  // adresse déjà utilisée par un autre compte (cas typique : compte PSC à email synthétique
  // qui saisit son vrai email, déjà porté par un compte email/MDP) → proposer une fusion
  // plutôt que d'échouer silencieusement sur le updateUserById plus bas.
  // Le jeton de fusion n'est JAMAIS renvoyé au client : il est envoyé par email à l'adresse
  // saisie. Recevoir le lien prouve la possession de la boîte — sans quoi n'importe qui
  // pourrait initier la fusion du compte d'un tiers en tapant simplement son email.
  if (user.email !== data.contact_email) {
    const { data: conflicting } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.contact_email)
      .neq('id', user.id)
      .limit(1)
    const conflictId = conflicting?.[0]?.id
    if (conflictId) {
      const fusionToken = generateFusionToken(user.id, conflictId)

      const headersList = await headers()
      const host = headersList.get('host') || 'www.100000medecins.org'
      const proto = headersList.get('x-forwarded-proto') || 'https'
      const siteUrl = `${proto}://${host}`
      const linkBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || siteUrl
      const lienFusion = `${linkBase}/fusionner-compte?token=${encodeURIComponent(fusionToken)}`

      const emailContent = await buildEmail('fusion_comptes', { lien_fusion: lienFusion }, siteUrl)
      if (!emailContent) throw new Error('Template email "fusion_comptes" introuvable')

      sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
      try {
        await sgMail.send({
          to: data.contact_email,
          from: 'contact@100000medecins.org',
          subject: emailContent.sujet,
          html: emailContent.html,
        })
      } catch {
        throw new Error('Erreur lors de l\'envoi de l\'email de fusion.')
      }

      return { status: 'FUSION_EMAIL_SENT', email: data.contact_email }
    }
  }

  const { error } = await supabase
    .from('users')
    .update({
      nom: data.nom,
      prenom: data.prenom,
      role: 'medecin',
      specialite: data.specialite,
      mode_exercice: data.mode_exercice,
      contact_email: data.contact_email,
      // pseudo/portrait : ne sont écrasés que s'ils sont explicitement fournis
      // (l'écran de complétion ne les envoie plus — ils se règlent dans /mon-compte/profil)
      ...(data.pseudo !== undefined ? { pseudo: data.pseudo.trim() || null } : {}),
      ...(data.portrait !== undefined ? { portrait: data.portrait || null } : {}),
      is_complete: true,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Mettre à jour l'email auth + mot de passe via admin (évite les problèmes
  // de ré-authentification côté client pour les sessions PSC)
  const authUpdates: Record<string, unknown> = {}
  if (user.email !== data.contact_email) {
    authUpdates.email = data.contact_email
    authUpdates.email_confirm = true
  }
  if (data.password && data.password.length >= 6) {
    authUpdates.password = data.password
  }
  if (Object.keys(authUpdates).length > 0) {
    await supabase.auth.admin.updateUserById(user.id, authUpdates)
  }

  return { status: 'SUCCESS' }
}

/**
 * Signalement d'une erreur dans les informations d'identité PSC (lecture seule).
 * Les champs PSC viennent de l'annuaire RPPS et ne sont pas modifiables ici : ce
 * signalement nous est envoyé par email pour triage (correction de mapping côté
 * site, surcharge admin, ou orientation vers l'Ordre).
 */
export async function signalerErreurIdentite(input: {
  champ: string
  message: string
  email: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const authClient = await createServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié.' }

  const email = input.email?.trim() ?? ''
  if (!email.includes('@')) return { ok: false, error: 'Adresse email invalide.' }
  if (!input.message?.trim()) return { ok: false, error: "Merci de préciser l'erreur." }

  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase
    .from('users')
    .select('nom, prenom, specialite, mode_exercice, rpps')
    .eq('id', user.id)
    .single()

  if (!process.env.SENDGRID_API_KEY) {
    console.error('[signalerErreurIdentite] SENDGRID_API_KEY absente — non envoyé')
    return { ok: false, error: 'Envoi indisponible pour le moment.' }
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const esc = (s: string | null | undefined) =>
    (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `
    <h2>Signalement d'erreur d'identité (Pro Santé Connect)</h2>
    <p><strong>Champ concerné :</strong> ${esc(input.champ)}</p>
    <p><strong>Message du médecin :</strong><br/>${esc(input.message).replace(/\n/g, '<br/>')}</p>
    <hr/>
    <p><strong>Identité PSC enregistrée :</strong></p>
    <ul>
      <li>Prénom : ${esc(profile?.prenom)}</li>
      <li>Nom : ${esc(profile?.nom)}</li>
      <li>Spécialité : ${esc(profile?.specialite)}</li>
      <li>Mode d'exercice : ${esc(profile?.mode_exercice)}</li>
      <li>RPPS : ${esc(profile?.rpps)}</li>
    </ul>
    <p><strong>Email de contact fourni :</strong> ${esc(email)}</p>
    <p><strong>User ID :</strong> ${esc(user.id)}</p>
  `

  try {
    await sgMail.send({
      to: 'david.azerad@100000medecins.org',
      from: 'contact@100000medecins.org',
      replyTo: email,
      subject: `Signalement identité — ${esc(profile?.prenom)} ${esc(profile?.nom)} (RPPS ${esc(profile?.rpps)})`,
      html,
    })
  } catch (e) {
    console.error('[signalerErreurIdentite] envoi SendGrid échoué', e)
    return { ok: false, error: "Erreur lors de l'envoi. Réessayez." }
  }
  return { ok: true }
}

export type EditeurClaimOption = {
  value: string  // 'editeur:uuid' ou 'solution:uuid'
  label: string
}

/**
 * Retourne la liste des éditeurs + solutions sans éditeur pour le dropdown
 * de revendication éditeur dans completer-profil.
 */
export async function getEditeurClaimOptions(): Promise<EditeurClaimOption[]> {
  const supabase = createServiceRoleClient()

  const [editeursRes, solutionsRes] = await Promise.all([
    supabase.from('editeurs').select('id, nom, nom_commercial'),
    supabase.from('solutions').select('id, nom').is('id_editeur', null).eq('statut', 'publiee'),
  ])

  const editeurs: EditeurClaimOption[] = (editeursRes.data || []).map((e) => ({
    value: `editeur:${e.id}`,
    label: (e.nom_commercial || e.nom || 'Éditeur sans nom') as string,
  }))

  const solutions: EditeurClaimOption[] = (solutionsRes.data || []).map((s) => ({
    value: `solution:${s.id}`,
    label: (s.nom || 'Solution sans nom') as string,
  }))

  return [...editeurs, ...solutions].sort((a, b) =>
    a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
  )
}

/**
 * Crée une demande de revendication d'espace éditeur pour l'utilisateur connecté.
 */
export async function createEditeurClaim(params: {
  editeur_id?: string
  solution_id?: string
  libre_texte?: string
}): Promise<{ error: string | null }> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('editeur_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('statut', 'en_attente')
    .single()

  if (existing) return { error: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('editeur_claims').insert({
    user_id: user.id,
    editeur_id: params.editeur_id || null,
    solution_id: params.solution_id || null,
    libre_texte: params.libre_texte || null,
  })

  if (error) return { error: error.message }
  return { error: null }
}

/**
 * Met à jour le profil utilisateur.
 * Remplace : mutation updateUser
 */
export async function updateProfile(userData: {
  nom?: string
  prenom?: string
  pseudo?: string | null
  annee_naissance?: number
  specialite?: string
  mode_exercice?: string
  densite_population?: string
  niveau_outils_numeriques?: string
  gestion_accueil?: string
  contact_email?: string
  contact_telephone?: string
  contact_adresse?: string
  contact_cp?: string
  contact_ville?: string
  contact_pays?: string
}) {
  const authClient = await createServerClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Service role pour bypasser le RLS sur toutes les opérations suivantes
  const supabase = createServiceRoleClient()

  // Vérifier l'unicité du contact_email (service role — voit toutes les lignes)
  if (userData.contact_email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('contact_email', userData.contact_email)
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return { status: 'EMAIL_DOUBLON', message: 'Cet email est déjà utilisé' }
    }
  }

  const requiredFields = ['nom', 'prenom', 'specialite', 'mode_exercice']
  const isComplete = requiredFields.every(
    (field) => userData[field as keyof typeof userData]
  )

  // UPSERT : met à jour la ligne si elle existe, la crée si absente
  // (cas rare : createUserProfile ayant échoué silencieusement à l'inscription)
  const upsertData = {
    id: user.id,
    email: user.email ?? '',
    ...userData,
    is_complete: isComplete,
  }

  const { error } = await supabase.from('users').upsert(upsertData, { onConflict: 'id' })

  if (error) throw new Error(error.message)

  revalidatePath('/mon-compte/profil')
  return { status: 'SUCCESS' }
}

/**
 * Données pour la bannière "Nouveaux avatars disponibles" :
 * - shouldShow : true si l'user est connecté ET n'a pas encore choisi de portrait
 * - avatars : catalogue trié (médicaux puis décalés)
 * Le cookie de dismiss est géré côté client.
 */
export async function getNouveauxAvatarsBannerData(): Promise<{
  shouldShow: boolean
  avatars: Array<{ id: string; url: string; isPersonal: boolean }>
}> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { shouldShow: false, avatars: [] }

  const { data: profile } = await supabase
    .from('users')
    .select('portrait')
    .eq('id', user.id)
    .single()

  const shouldShow = !profile?.portrait
  if (!shouldShow) return { shouldShow: false, avatars: [] }

  const avatars = await getAvatars()
  return { shouldShow: true, avatars }
}

/**
 * Liste les avatars disponibles : catalogue public + avatars personnels de l'user connecté.
 * Les avatars perso sont placés en tête de liste (priorité visuelle).
 * Chaque item est annoté avec isPersonal pour permettre l'affichage par section côté UI.
 */
export async function getAvatars(): Promise<Array<{ id: string; url: string; isPersonal: boolean }>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createServiceRoleClient()

  // Catalogue (user_id IS NULL), trié par display_order
  const cataloguePromise = admin
    .from('avatars')
    .select('id, url')
    .is('user_id', null)
    .order('display_order', { ascending: true, nullsFirst: false })

  // Avatars perso de l'user (si connecté), triés par id desc (récents en premier)
  const personalPromise = user
    ? admin.from('avatars').select('id, url').eq('user_id', user.id).order('id', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [catalogueRes, personalRes] = await Promise.all([cataloguePromise, personalPromise])
  const catalogue = (catalogueRes.data ?? []) as Array<{ id: string; url: string }>
  const personal = (personalRes.data ?? []) as Array<{ id: string; url: string }>

  return [
    ...personal.map((a) => ({ ...a, isPersonal: true })),
    ...catalogue.map((a) => ({ ...a, isPersonal: false })),
  ]
}

/**
 * Supprime un avatar perso précis appartenant à l'user connecté.
 * Si c'est son portrait actuel, le portrait passe à NULL.
 */
export async function deletePersonalAvatar(avatarId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()

  // Vérifie que l'avatar existe ET appartient bien à l'user (sécurité)
  const { data: avatar, error: fetchErr } = await admin
    .from('avatars')
    .select('id, url, user_id')
    .eq('id', avatarId)
    .single()
  if (fetchErr || !avatar) throw new Error('Avatar introuvable')
  if (avatar.user_id !== user.id) throw new Error('Cet avatar ne t\'appartient pas')

  // Si c'est son portrait actuel, le reset à NULL
  const { data: profile } = await admin
    .from('users')
    .select('portrait')
    .eq('id', user.id)
    .single()
  if (profile?.portrait === avatarId) {
    await admin.from('users').update({ portrait: null }).eq('id', user.id)
  }

  // Supprime le fichier Storage
  const match = avatar.url.match(/\/avatars\/(personal\/[^/]+\/[^/]+\.png)$/)
  if (match) {
    await admin.storage.from('avatars').remove([match[1]])
  }

  // Supprime la ligne BDD
  await admin.from('avatars').delete().eq('id', avatarId)

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}

/**
 * Retourne le quota restant + flag d'exemption pour l'user connecté.
 * Quota max : 3 par 24h. Les emails listés dans AVATAR_QUOTA_UNLIMITED_EMAILS (env var, séparés par virgules)
 * voient le décompte normal mais peuvent continuer à générer même après avoir atteint 0.
 */
const AVATAR_GENERATION_DAILY_QUOTA = 3

function isQuotaExempt(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.AVATAR_QUOTA_UNLIMITED_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export async function getRemainingAvatarGenerations(): Promise<{
  remaining: number
  isExempt: boolean
}> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { remaining: 0, isExempt: false }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('avatar_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)

  return {
    remaining: Math.max(0, AVATAR_GENERATION_DAILY_QUOTA - (count ?? 0)),
    isExempt: isQuotaExempt(user.email),
  }
}

/**
 * Génère un avatar personnalisé à partir d'une photo source via l'API Retro Diffusion (img2img).
 * Quota : 3 par 24h. Le PNG résultat est stocké dans Supabase Storage et inséré dans la table avatars.
 * La photo source N'EST PAS stockée (RGPD).
 */
export async function generatePersonalAvatar(description: string): Promise<{
  avatarId: string
  url: string
  remaining: number
  isExempt: boolean
}> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Quota check : bloquant seulement pour les non-exemptés
  const { remaining, isExempt } = await getRemainingAvatarGenerations()
  if (remaining <= 0 && !isExempt) {
    throw new Error('Quota de générations atteint pour aujourd\'hui (3 par 24h)')
  }

  // Pas de cleanup auto ici : l'user peut conserver tous ses avatars perso (anciens choix + essais)
  // et les supprimer manuellement via la ✕ rouge dans la grille "Mes avatars personnels".

  // Validation de la description
  const desc = description.trim()
  if (desc.length < 10) {
    throw new Error('Décrivez votre avatar avec un peu plus de détails (au moins 10 caractères).')
  }
  if (desc.length > 300) {
    throw new Error('Description trop longue (max 300 caractères).')
  }

  const RD_API_KEY = process.env.RD_API_KEY
  if (!RD_API_KEY) throw new Error('Configuration API manquante (RD_API_KEY)')

  // Wrap la description user dans notre prompt master — aligné sur le catalogue low_res 64
  // (sans "Bullfrog" qui faisait littéralement apparaître des grenouilles quand RD filtre les IP)
  const prompt = [
    `pixel art portrait, ${desc}`,
    'frontal bust portrait facing camera directly, looking straight at viewer',
    'transparent background',
    'chunky pixels, blocky 8-bit retro style',
    'flat solid colors, hard pixel edges, no anti-aliasing, no smooth shading',
    '8-bit retro video game character sprite',
    'friendly face',
  ].join(', ')

  const rdResponse = await fetch('https://api.retrodiffusion.ai/v1/inferences', {
    method: 'POST',
    headers: {
      'X-RD-Token': RD_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: 64,
      height: 64,
      prompt_style: 'rd_plus__low_res',
      num_images: 1,
      remove_bg: true,
      // text-to-image pur : pas d'input_image, pas de strength
    }),
  })

  if (!rdResponse.ok) {
    const err = await rdResponse.text()
    console.error('Retro Diffusion API error:', rdResponse.status, err)
    throw new Error('Échec de la génération. Réessayez dans un instant.')
  }

  const rdData = (await rdResponse.json()) as {
    base64_images: string[]
    balance_cost: number
    remaining_balance: number
  }
  const nativeBuffer = Buffer.from(rdData.base64_images[0], 'base64')

  // Upscale x2 nearest neighbor (128 → 256) pour matcher la taille du catalogue
  const pngBuffer = await sharp(nativeBuffer)
    .resize(256, 256, { kernel: 'nearest' })
    .png()
    .toBuffer()

  // Upload vers Supabase Storage : avatars/personal/<user_id>/<timestamp>.png
  const admin = createServiceRoleClient()
  const filename = `personal/${user.id}/${Date.now()}.png`
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(filename, pngBuffer, { contentType: 'image/png', upsert: false })
  if (uploadErr) {
    console.error('Storage upload error:', uploadErr)
    throw new Error('Échec de l\'enregistrement du nouvel avatar')
  }

  const { data: pub } = admin.storage.from('avatars').getPublicUrl(filename)
  const publicUrl = pub.publicUrl

  // INSERT avatar (perso = user_id non NULL)
  const { data: inserted, error: insertErr } = await admin
    .from('avatars')
    .insert({ url: publicUrl, user_id: user.id })
    .select('id')
    .single()
  if (insertErr || !inserted) {
    console.error('Avatar insert error:', insertErr)
    throw new Error('Échec de l\'enregistrement de l\'avatar')
  }

  // Trace la génération pour le quota
  await admin.from('avatar_generations').insert({ user_id: user.id })

  revalidatePath('/mon-compte')
  return {
    avatarId: inserted.id,
    url: publicUrl,
    remaining: Math.max(0, remaining - 1),
    isExempt,
  }
}

/**
 * Supprime les avatars personnels d'un user qui ne sont plus son portrait actuel.
 * Supprime à la fois les lignes BDD et les fichiers dans Supabase Storage.
 * À appeler après chaque updateAvatar / removeAvatar / avant chaque generatePersonalAvatar.
 */
async function cleanupAbandonedPersonalAvatars(userId: string): Promise<void> {
  const admin = createServiceRoleClient()

  // 1. Portrait actuel
  const { data: profile } = await admin
    .from('users')
    .select('portrait')
    .eq('id', userId)
    .single()
  const currentPortrait = profile?.portrait ?? null

  // 2. Liste des avatars perso à supprimer (perso de l'user, hors portrait actuel)
  let query = admin.from('avatars').select('id, url').eq('user_id', userId)
  if (currentPortrait) query = query.neq('id', currentPortrait)
  const { data: toDelete } = await query

  if (!toDelete || toDelete.length === 0) return

  // 3. Supprime les fichiers du Storage (extrait le chemin "personal/<uid>/<ts>.png" depuis l'URL publique)
  const filenames = toDelete
    .map((a) => {
      const match = a.url.match(/\/avatars\/(personal\/[^/]+\/[^/]+\.png)$/)
      return match ? match[1] : null
    })
    .filter((f): f is string => !!f)
  if (filenames.length > 0) {
    await admin.storage.from('avatars').remove(filenames)
  }

  // 4. Supprime les lignes BDD
  await admin
    .from('avatars')
    .delete()
    .in('id', toDelete.map((a) => a.id))
}

/**
 * Supprime l'avatar de l'utilisateur (retour au fallback initiale).
 * Nettoie aussi tous ses anciens avatars perso (qui ne servent plus).
 */
export async function removeAvatar() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('users')
    .update({ portrait: null })
    .eq('id', user.id)
  if (error) throw error

  // Portrait est maintenant NULL → cleanup va supprimer TOUS les perso
  await cleanupAbandonedPersonalAvatars(user.id)

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}

/**
 * Met à jour l'avatar de l'utilisateur.
 * Remplace : mutation updateAvatar
 */
export async function updateAvatar(avatarId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier que l'avatar existe avant d'écrire (évite un UUID arbitraire)
  const { error: checkError } = await supabase
    .from('avatars')
    .select('id')
    .eq('id', avatarId)
    .single()
  if (checkError) throw checkError

  // users.portrait stocke désormais l'UUID, plus l'URL — l'affichage résout via jointure
  const { error } = await supabase
    .from('users')
    .update({ portrait: avatarId })
    .eq('id', user.id)

  if (error) throw error

  // Pas de cleanup auto ici : l'user veut pouvoir conserver ses anciens avatars perso
  // dans la grille "Mes avatars personnels" pour pouvoir y revenir. Suppression manuelle via ✕.

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}

/**
 * Annule un changement d'email en attente de confirmation.
 * Remet l'email actuel confirmé, ce qui efface le token de changement.
 */
export async function cancelEmailChange() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: user.email!,
    email_confirm: true,
  })

  if (error) throw new Error(error.message)
  return { status: 'SUCCESS' }
}

/**
 * Ajoute une préférence à l'utilisateur.
 * Remplace : mutation setPreferenceUser
 */
export async function setPreference(preferenceId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('users_preferences')
    .insert({
      user_id: user.id,
      preference_id: preferenceId,
    })

  if (error && error.code !== '23505') throw error // 23505 = unique violation

  revalidatePath('/mon-compte/mes-preferences')
  return { status: 'SUCCESS' }
}

/**
 * Retire une préférence de l'utilisateur.
 * Remplace : mutation deletePreferenceUser
 */
export async function removePreference(preferenceId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('users_preferences')
    .delete()
    .eq('user_id', user.id)
    .eq('preference_id', preferenceId)

  if (error) throw error

  revalidatePath('/mon-compte/mes-preferences')
  return { status: 'SUCCESS' }
}

/**
 * Rattache les évaluations anonymes en attente (en_attente_psc) à l'utilisateur
 * connecté, en matchant sur email_temp. Utilisé au chargement du profil pour
 * couvrir le cas "compte existant + connexion email/mdp" (pas de callback signup).
 */
export async function rattacherEvalsAnonymes(): Promise<number> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 0

  const adminSupabase = createServiceRoleClient()
  const { data: pendingEvals } = await adminSupabase
    .from('evaluations')
    .select('id, solution_id')
    .eq('email_temp', user.email.toLowerCase())
    .eq('statut', 'en_attente_psc')

  if (!pendingEvals || pendingEvals.length === 0) return 0

  // Ne publier que si l'utilisateur a un RPPS (identité PSC vérifiée).
  // Sinon : éval rattachée mais statut reste en_attente_psc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRow } = await (adminSupabase as any)
    .from('users')
    .select('rpps')
    .eq('id', user.id)
    .single()
  const nouveauStatut = profileRow?.rpps ? 'publiee' : 'en_attente_psc'

  await adminSupabase
    .from('evaluations')
    .update({ user_id: user.id, statut: nouveauStatut, email_temp: null, token_verification: null })
    .eq('email_temp', user.email.toLowerCase())
    .eq('statut', 'en_attente_psc')

  const { recalcResultatsPourSolution, ensureSolutionUtilisee } = await import('@/lib/actions/evaluation')
  const solutionIds = [...new Set(pendingEvals.map((e) => e.solution_id).filter(Boolean) as string[])]
  await Promise.all(solutionIds.map((id) => ensureSolutionUtilisee(user.id, id)))
  if (nouveauStatut === 'publiee') {
    await Promise.all(solutionIds.map((id) => recalcResultatsPourSolution(id)))
  }

  return pendingEvals.length
}
