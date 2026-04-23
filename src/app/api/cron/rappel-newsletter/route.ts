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
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: configRow } = await (supabase as any)
    .from('site_config')
    .select('valeur')
    .eq('cle', 'crons_routiniers_actifs')
    .maybeSingle()
  if (configRow?.valeur !== 'true') {
    return NextResponse.json({ skipped: true, reason: 'crons disabled by admin' })
  }

  const siteUrl = new URL(req.url).origin
  const now = new Date()

  // Brouillons créés il y a plus de 5 jours et pas encore envoyés
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drafts } = await (supabase as any)
    .from('newsletters')
    .select('id, mois, sujet, created_at, reminded_at')
    .eq('status', 'draft')
    .lt('created_at', fiveDaysAgo)

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 })
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  let reminded = 0

  for (const draft of drafts) {
    // Ne pas relancer si déjà rappelé il y a moins d'un jour
    if (draft.reminded_at && new Date(draft.reminded_at) > new Date(oneDayAgo)) continue

    const moisLabel = new Date(draft.mois + '-01').toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })

    try {
      await sgMail.send({
        to: adminEmail,
        from: 'contact@100000medecins.org',
        subject: `[Rappel] Newsletter ${moisLabel} — en attente de validation`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;">
            <p>⚠️ La newsletter de <strong>${moisLabel}</strong> n'a pas encore été envoyée.</p>
            <p><strong>Objet :</strong> ${draft.sujet ?? '(sans objet)'}</p>
            <p>
              <a href="${siteUrl}/admin/newsletters"
                 style="display:inline-block;background:#0f2a4e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Relire et envoyer →
              </a>
            </p>
          </div>
        `,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('newsletters')
        .update({ reminded_at: now.toISOString() })
        .eq('id', draft.id)

      reminded++
    } catch (e) {
      console.error(`[rappel-newsletter] draft ${draft.id}:`, e)
    }
  }

  return NextResponse.json({ ok: true, reminded })
}
