import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateRevalidationLink } from '@/lib/email/revalidation'
import { withEmailLogo } from '@/lib/email/logo'
import sgMail from '@sendgrid/mail'

function generateAdminToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateAdminToken()) throw new Error('Non autorisé')
}

function buildExcuseHtml(nom: string, solutionNom: string, lien1Clic: string, lienReevaluation: string, lienDesabonnement: string): string {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:32px 12px;">
    <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <tr><td style="background:linear-gradient(135deg,#0f1e38 0%,#1a3a6e 100%);border-radius:16px 16px 0 0;padding:28px 32px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">100 000 Médecins</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Toutes nos excuses</p>
        <p style="margin:6px 0 0;font-size:14px;color:#bfdbfe;line-height:1.4;">Un lien ne fonctionnait pas dans notre email de ce matin</p>
      </td></tr>

      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;">

        <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Bonjour ${nom},</p>

        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">
          Ce matin, nous vous avons envoyé un email vous invitant à confirmer votre avis sur
          <strong style="color:#0f1e38;">${solutionNom}</strong>.
          En raison d'un problème technique de notre côté, <strong>le lien contenu dans cet email ne fonctionnait pas</strong>.
        </p>

        <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.65;">
          Nous nous en excusons sincèrement. Voici le lien corrigé :
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr><td align="center">
            <a href="${lien1Clic}"
               style="display:inline-block;background:#0f1e38;color:#ffffff;padding:15px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.01em;">
              Confirmer mon avis en 1 clic &rarr;
            </a>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td align="center">
            <a href="${lienReevaluation}"
               style="display:inline-block;background:#f3f4f6;color:#0f1e38;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
              Accéder à mes évaluations
            </a>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:10px;margin-bottom:28px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Le bouton "Confirmer en 1 clic"</strong> valide votre avis actuel sans rien changer à votre évaluation — c'est simplement pour confirmer que votre retour est toujours d'actualité.
            </p>
          </td></tr>
        </table>

        <p style="margin:0 0 4px;font-size:14px;color:#374151;">Encore désolés pour la gêne occasionnée.</p>
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">L'équipe 100 000 Médecins</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;" />

        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
          Vous recevez cet email car vous avez évalué un logiciel médical sur 100 000 Médecins.<br>
          <a href="${lienDesabonnement}" style="color:#9ca3af;text-decoration:underline;">Gérer mes préférences de notifications</a>
        </p>

      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
  return withEmailLogo(html)
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('evaluations')
    .select('id', { count: 'exact', head: true })
    .gte('last_relance_sent_at', '2026-04-23 00:00:00+00')
    .lt('last_relance_sent_at', '2026-04-24 00:00:00+00')

  return NextResponse.json({ count: count ?? 0 })
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin()
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evals } = await (supabase as any)
    .from('evaluations')
    .select('id, user_id, solution_id, solution:solutions(nom), user:users(email, nom)')
    .gte('last_relance_sent_at', '2026-04-23 00:00:00+00')
    .lt('last_relance_sent_at', '2026-04-24 00:00:00+00')

  if (!evals || evals.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucun destinataire trouvé' })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  let sent = 0
  const errors: string[] = []

  for (const ev of evals) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = ev.user as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solution = ev.solution as any

    if (!user?.email || !solution?.nom) continue

    const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
    const lien1Clic = generateRevalidationLink(ev.user_id as string, ev.solution_id as string, siteUrl)
    const lienReevaluation = `${siteUrl}/mon-compte/mes-evaluations`
    const lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`

    const html = buildExcuseHtml(nomDisplay, solution.nom, lien1Clic, lienReevaluation, lienDesabonnement)

    try {
      await sgMail.send({
        to: user.email,
        from: 'contact@100000medecins.org',
        subject: `Toutes nos excuses — votre lien de réévaluation (${solution.nom})`,
        html,
      })
      sent++
    } catch (e) {
      errors.push(`eval ${ev.id} (${user.email}): ${e}`)
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: evals.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
