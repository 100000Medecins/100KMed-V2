import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'
  const now = Date.now()

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  // Récupérer les vidéos avec un pin actif ou récemment expiré
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pinned } = await (supabase as any)
    .from('videos')
    .select('id, titre, homepage_pinned_at, homepage_ordre')
    .not('homepage_pinned_at', 'is', null)
    .order('homepage_ordre', { ascending: true })

  if (!pinned || pinned.length === 0) {
    return NextResponse.json({ ok: true, action: 'nothing' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = pinned.filter((v: any) => now - new Date(v.homepage_pinned_at).getTime() < thirtyDaysMs)
  if (active.length === 0) {
    return NextResponse.json({ ok: true, action: 'nothing' })
  }

  // Date d'expiration = homepage_pinned_at + 30 jours
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinnedAt = new Date(active[0].homepage_pinned_at).getTime()
  const expiresAt = pinnedAt + thirtyDaysMs
  const msLeft = expiresAt - now

  // Envoyer seulement si expire dans 7 jours ou moins
  if (msLeft > sevenDaysMs) {
    return NextResponse.json({ ok: true, action: 'nothing', expires_in_days: Math.ceil(msLeft / (1000 * 60 * 60 * 24)) })
  }

  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const expiryDate = new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  const videoList = active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((v: any, i: number) => `<li>${i + 1}. ${v.titre ?? '(sans titre)'}</li>`)
    .join('')

  try {
    await sgMail.send({
      to: adminEmail,
      from: 'contact@100000medecins.org',
      subject: daysLeft === 0
        ? "[Action requise] La sélection vidéos page d'accueil a expiré"
        : `[Rappel] Sélection vidéos accueil — expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;color:#1a1a2e;">
          <p>${daysLeft === 0
            ? '⚠️ La sélection forcée des vidéos sur la page d\'accueil <strong>a expiré</strong>. Le site affiche désormais les 6 dernières vidéos publiées automatiquement.'
            : `⏰ La sélection forcée des vidéos page d\'accueil <strong>expire le ${expiryDate}</strong> (dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}).`}
          </p>
          <p>Vidéos actuellement sélectionnées :</p>
          <ul style="color:#555;font-size:14px;">${videoList}</ul>
          <p>
            <a href="${siteUrl}/admin/videos"
               style="display:inline-block;background:#0f2a4e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Gérer la sélection →
            </a>
          </p>
          <p style="font-size:12px;color:#999;">
            Si vous ne faites rien, le site passera en mode automatique (6 dernières vidéos publiées).
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true, action: 'email_sent', days_left: daysLeft })
  } catch (e) {
    console.error('[rappel-accueil-videos]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
