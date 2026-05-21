import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyConfirmToken } from '@/lib/email/confirm-token'
import type { Database } from '@/types/database'

/**
 * Confirmation d'inscription email via lien HMAC idempotent.
 *
 * Contrairement au token OTP natif de Supabase (usage unique), ce lien est
 * rejouable : le pré-scan par les clients mail / antivirus ne « consomme »
 * plus rien. La confirmation de l'email est garantie idempotente ; l'auto-login
 * est tenté par-dessus en best-effort (dégradé propre s'il échoue).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const uid = searchParams.get('uid')
  const iat = Number(searchParams.get('iat'))
  const token = searchParams.get('token')
  // Propagé depuis /inscription?type=editeur → pré-sélectionne le mode éditeur
  const typeSuffix = searchParams.get('type') === 'editeur' ? '?type=editeur' : ''

  if (!uid || !iat || !token) {
    return NextResponse.redirect(`${origin}/connexion?error=confirm_invalid`)
  }

  const verdict = verifyConfirmToken(uid, iat, token)
  if (verdict === 'invalid') return NextResponse.redirect(`${origin}/connexion?error=confirm_invalid`)
  if (verdict === 'expired') return NextResponse.redirect(`${origin}/connexion?error=confirm_expired`)

  const admin = createServiceRoleClient()

  // 1) Confirmer l'email — idempotent (re-confirmer un email déjà confirmé = no-op)
  const { data: userData, error: updateError } = await admin.auth.admin.updateUserById(uid, {
    email_confirm: true,
  })
  if (updateError || !userData?.user?.email) {
    return NextResponse.redirect(`${origin}/connexion?error=confirm_invalid`)
  }
  const email = userData.user.email

  // 2) Auto-login best-effort : magiclink frais généré + consommé côté serveur.
  //    Un magiclink neuf est créé à chaque appel → pas de collision avec un éventuel
  //    pré-scan (le scanner consomme SON magiclink, l'utilisateur le sien).
  try {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (!linkError && tokenHash) {
      const cookieStore = await cookies()
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            },
          },
        }
      )
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      if (!otpError) {
        // Session créée. Vers la complétion de profil si nécessaire.
        const { data: profile } = await supabase
          .from('users')
          .select('is_complete')
          .eq('id', uid)
          .single()
        const dest = (profile as { is_complete?: boolean } | null)?.is_complete
          ? '/mon-compte/profil'
          : `/completer-profil${typeSuffix}`
        return NextResponse.redirect(`${origin}${dest}`)
      }
    }
  } catch (e) {
    console.error('[confirm-email] auto-login best-effort failed:', e)
  }

  // 3) Dégradé gracieux : email confirmé, mais auto-login indisponible → connexion manuelle
  return NextResponse.redirect(`${origin}/connexion?confirmed=1`)
}
