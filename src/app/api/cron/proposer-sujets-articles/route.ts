import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { EMAIL_SENDER } from '@/lib/email/sender'
import {
  creerLotPropositions,
  lundiDeLaSemaine,
  type PropositionArticle,
} from '@/lib/propositions-articles'

export const dynamic = 'force-dynamic'
// Tavily (3 requêtes en parallèle) + un appel modèle : même plafond que le cron newsletter.
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildEmailHtml(propositions: PropositionArticle[], siteUrl: string): string {
  const cartes = propositions.map((p) => `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${p.type === 'actu' ? '#b45309' : '#6b7280'};font-weight:600;margin-bottom:6px;">
        ${p.type === 'actu' ? 'Actualité' : 'Dossier'}
      </div>
      <div style="font-size:15px;font-weight:700;color:#0f1e38;margin-bottom:6px;">${esc(p.titre)}</div>
      <div style="font-size:13px;color:#4b5563;line-height:1.5;">${esc(p.angle)}</div>
    </div>
  `).join('')

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;">
      <p style="font-size:14px;color:#4b5563;">
        Trois sujets d'articles proposés pour cette semaine.
      </p>
      ${cartes}
      <p style="margin-top:20px;">
        <a href="${siteUrl}/admin/blog"
           style="display:inline-block;background:#0f1e38;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Choisir un sujet →
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">
        Depuis l'admin, vous pouvez rédiger un sujet, l'écarter, ou regénérer le lot
        avec un cadrage de votre choix.
      </p>
    </div>
  `
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  // Volontairement NON gaté par `crons_routiniers_actifs` : ce drapeau coupe les
  // relances envoyées aux utilisateurs. Ce cron n'écrit qu'en base et n'envoie
  // qu'un email interne à l'admin — même traitement que `digest-activite`.
  const supabase = createServiceRoleClient()

  const semaine = lundiDeLaSemaine()

  // Anti-doublon : un seul lot par semaine, quel que soit le sort des propositions
  // (un re-déclenchement manuel ou un retry Vercel ne doit rien ajouter).
  const { data: existant } = await supabase
    .from('propositions_articles')
    .select('id')
    .eq('semaine', semaine)
    .limit(1)

  if (existant && existant.length > 0) {
    return NextResponse.json({ skipped: true, reason: 'Lot déjà généré cette semaine', semaine })
  }

  const resultat = await creerLotPropositions(supabase, { semaine })
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.error }, { status: 500 })
  }

  const siteUrl = new URL(req.url).origin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: adminEmail,
      from: EMAIL_SENDER,
      subject: `[100 000 Médecins] ${resultat.propositions.length} sujets d'articles pour cette semaine`,
      html: buildEmailHtml(resultat.propositions, siteUrl),
    })
  } catch (e) {
    // Le lot est déjà en base et visible dans l'admin : un email raté ne doit pas
    // faire échouer le cron ni déclencher une seconde génération au retry.
    console.error('[proposer-sujets-articles] notification email failed:', e)
  }

  return NextResponse.json({
    ok: true,
    semaine,
    lotId: resultat.lotId,
    sujets: resultat.propositions.map((p) => p.titre),
  })
}
