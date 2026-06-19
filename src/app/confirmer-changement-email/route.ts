import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyEmailChangeToken } from '@/lib/email/email-change-token'
import { buildEmail } from '@/lib/actions/emailTemplates'
import sgMail from '@sendgrid/mail'

/**
 * Confirmation d'un changement d'email via lien HMAC idempotent (remplace l'email natif
 * Supabase `auth.updateUser({ email })`). Le clic depuis la nouvelle boîte prouve le
 * contrôle de l'adresse → email_confirm: true. Met à jour auth.users ET public.users.email
 * (cohérence avec la résolution d'uid par email dans sendPasswordReset), puis notifie
 * l'ancienne adresse (courtoisie anti-prise-de-contrôle).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const uid = searchParams.get('uid')
  const iat = Number(searchParams.get('iat'))
  const token = searchParams.get('token')
  const newEmail = (searchParams.get('new_email') || '').trim().toLowerCase()

  if (!uid || !newEmail || !iat || !token) {
    return NextResponse.redirect(`${origin}/mon-compte/profil?email_error=invalid`)
  }

  const verdict = verifyEmailChangeToken(uid, newEmail, iat, token)
  if (verdict === 'invalid') return NextResponse.redirect(`${origin}/mon-compte/profil?email_error=invalid`)
  if (verdict === 'expired') return NextResponse.redirect(`${origin}/mon-compte/profil?email_error=expired`)

  const admin = createServiceRoleClient()

  // Ancienne adresse (pour l'email de courtoisie), lue AVANT la mutation.
  const { data: before } = await admin.auth.admin.getUserById(uid)
  const oldEmail = before?.user?.email ?? null

  // 1) auth.users.email + email_confirm
  const { error: authErr } = await admin.auth.admin.updateUserById(uid, {
    email: newEmail,
    email_confirm: true,
  })
  if (authErr) {
    const code = authErr.message?.toLowerCase().includes('already') ? 'taken' : 'failed'
    return NextResponse.redirect(`${origin}/mon-compte/profil?email_error=${code}`)
  }

  // 2) Synchro public.users.email (sendPasswordReset résout l'uid via users.email).
  //    contact_email volontairement non touché (sémantique PSC, hors périmètre).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('users').update({ email: newEmail }).eq('id', uid)

  // 3) Email de courtoisie à l'ancienne adresse.
  if (oldEmail && oldEmail.toLowerCase() !== newEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || origin
    const courtesy = await buildEmail(
      'notification_changement_email',
      { ancienne_adresse: oldEmail, nouvelle_adresse: newEmail, lien_contact: `${siteUrl}/contact` },
      siteUrl,
    )
    if (courtesy) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
        await sgMail.send({
          to: oldEmail,
          from: 'contact@100000medecins.org',
          subject: courtesy.sujet,
          html: courtesy.html,
        })
      } catch {
        // best-effort : le changement est appliqué même si la notification échoue
      }
    }
  }

  return NextResponse.redirect(`${origin}/mon-compte/profil?email_changed=1`)
}
