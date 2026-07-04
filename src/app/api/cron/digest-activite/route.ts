import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

export const dynamic = 'force-dynamic'

const DIGEST_TO = 'david.azerad@100000medecins.org'
const WINDOW_DAYS = 7

// Libellés lisibles par type d'événement (miroir de la page /admin/activite).
const TYPE_LABELS: Record<string, string> = {
  inscription_email: 'Inscriptions email',
  inscription_psc: 'Inscriptions PSC',
  evaluation_publiee: 'Évaluations publiées',
  evaluation_en_attente_psc: 'Évaluations en attente PSC',
  evaluation_a_completer: 'Évaluations à compléter',
  editeur_modif_fiche: 'Modifs fiche éditeur',
  editeur_modif_solution: 'Modifs solution',
  proposition: 'Propositions',
  revendication: 'Revendications',
  demande_referencement: 'Demandes de référencement',
  admin_suppression: 'Suppressions admin',
  admin_parametre: 'Paramètres admin',
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()
  const siteUrl = new URL(req.url).origin

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS)

  const { data: rows, error } = await supabase
    .from('activity_log')
    .select('type, acteur_label, cible_label, gravite, created_at')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = rows ?? []

  // Rien sur la période → pas d'email (on n'envoie pas de digest vide).
  if (events.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: 'aucun événement sur la période' })
  }

  // Comptage par type + total à modérer
  const counts: Record<string, number> = {}
  let nbAModerer = 0
  for (const ev of events) {
    counts[ev.type] = (counts[ev.type] ?? 0) + 1
    if (ev.gravite === 'a_moderer') nbAModerer++
  }

  const countsRows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([type, n]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${esc(TYPE_LABELS[type] ?? type)}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${n}</td></tr>`
    )
    .join('')

  const recentRows = events
    .slice(0, 40)
    .map((ev) => {
      const when = new Date(ev.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
      const acteur = ev.acteur_label ? esc(ev.acteur_label) : '—'
      const cible = ev.cible_label ? ` → ${esc(ev.cible_label)}` : ''
      return (
        `<tr><td style="padding:4px 12px;border-bottom:1px solid #f3f3f3;color:#888;white-space:nowrap;">${when}</td>` +
        `<td style="padding:4px 12px;border-bottom:1px solid #f3f3f3;">${esc(TYPE_LABELS[ev.type] ?? ev.type)}</td>` +
        `<td style="padding:4px 12px;border-bottom:1px solid #f3f3f3;">${acteur}${cible}</td></tr>`
      )
    })
    .join('')

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;max-width:640px;margin:0 auto;">
      <h2 style="color:#1B2A4A;">Activité du site — 7 derniers jours</h2>
      <p style="color:#555;">${events.length} événement${events.length > 1 ? 's' : ''} au total.
      ${nbAModerer > 0 ? `<strong style="color:#b45309;">${nbAModerer} à modérer.</strong>` : 'Rien à modérer.'}</p>

      <h3 style="color:#1B2A4A;margin-top:24px;">Répartition</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${countsRows}</table>

      <h3 style="color:#1B2A4A;margin-top:24px;">Détail (40 plus récents)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${recentRows}</table>

      <p style="margin-top:24px;">
        <a href="${siteUrl}/admin/activite" style="color:#4A90D9;">Voir le flux complet →</a>
      </p>
    </div>
  `

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: DIGEST_TO,
      from: EMAIL_SENDER,
      subject: `[Activité] ${events.length} événement${events.length > 1 ? 's' : ''} cette semaine${nbAModerer > 0 ? ` — ${nbAModerer} à modérer` : ''}`,
      html,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: true, total: events.length, aModerer: nbAModerer })
}
