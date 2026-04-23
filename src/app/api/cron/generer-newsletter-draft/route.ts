import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'
import { buildNewsletterHtml } from '@/lib/email/newsletter-template'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function getChangelogForMonth(yearMonth: string): string {
  try {
    const changelog = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
    const lines = changelog.split('\n')
    const result: string[] = []
    let inSection = false
    for (const line of lines) {
      if (line.startsWith(`## [${yearMonth}`)) inSection = true
      else if (line.startsWith('## [') && inSection) break
      if (inSection) result.push(line)
    }
    return result.slice(0, 60).join('\n').trim()
  } catch {
    return ''
  }
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

  const now = new Date()
  const yearMonth = now.toISOString().slice(0, 7)
  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const today = now.toISOString().slice(0, 10)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Skip si déjà générée ce mois
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('newsletters')
    .select('id')
    .eq('mois', yearMonth)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Newsletter already exists for this month' })
  }

  // Études cliniques actives
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: etudes } = await (supabase as any)
    .from('etudes_cliniques')
    .select('titre, description, lien, date_fin')
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(3)

  // Questionnaires de thèse publiés et actifs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questionnaires } = await (supabase as any)
    .from('questionnaires_these')
    .select('titre, description, lien, date_fin')
    .eq('statut', 'publie')
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(3)

  const changelogText = getChangelogForMonth(yearMonth)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etudesText = (etudes ?? []).map((e: any) =>
    `- ${e.titre}${e.description ? ' : ' + e.description.slice(0, 200) : ''}`
  ).join('\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionnairesText = (questionnaires ?? []).map((q: any) =>
    `- ${q.titre}${q.description ? ' : ' + q.description.slice(0, 200) : ''}`
  ).join('\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Tu génères le contenu textuel d'une newsletter mensuelle pour "100 000 Médecins" (${moisLabel}).

Ton rôle : écrire les textes d'accroche uniquement — pas le HTML, le design est géré séparément.
Style : professionnel, chaleureux, "confrères entre eux", sobre et direct. Pas de jargon marketing.

CONTEXTE DU MOIS :
${etudesText ? `Études cliniques en cours :\n${etudesText}` : 'Aucune étude en cours ce mois-ci.'}

${questionnairesText ? `Questionnaires de thèse ouverts :\n${questionnairesText}` : 'Aucun questionnaire ce mois-ci.'}

${changelogText ? `Nouveautés plateforme (reformule en bénéfices utilisateur, sans termes techniques) :\n${changelogText.slice(0, 1500)}` : ''}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks, sans commentaires) avec exactement ces 4 champs :
- "sujet" : objet de l'email, accrocheur, moins de 70 caractères, sans mention du mois
- "intro" : paragraphe d'introduction après "Bonjour {{nom}},", 2-3 phrases max, chaleureux et engageant
- "conclusion" : phrase d'accroche pour la section "Votre avis compte", 1-2 phrases max, motivante et sobre
- "nouveautes" : si des nouveautés techniques sont mentionnées, reformule en 2-3 phrases bénéfices utilisateur. Sinon laisse ""`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: { sujet: string; intro: string; conclusion: string; nouveautes: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Réponse Claude invalide', raw }, { status: 500 })
  }

  const contenuHtml = buildNewsletterHtml({
    sujet: parsed.sujet,
    intro: parsed.intro,
    conclusion: parsed.conclusion,
    nouveautes: parsed.nouveautes,
    etudes: etudes ?? [],
    questionnaires: questionnaires ?? [],
    moisLabel,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draft, error: insertError } = await (supabase as any)
    .from('newsletters')
    .insert({
      mois: yearMonth,
      sujet: parsed.sujet,
      contenu_html: contenuHtml,
      status: 'draft',
      notified_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Notifier l'admin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: adminEmail,
      from: 'contact@100000medecins.org',
      subject: `[100 000 Médecins] Newsletter ${moisLabel} — brouillon à valider`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;">
          <p>La newsletter de <strong>${moisLabel}</strong> a été générée automatiquement.</p>
          <p><strong>Objet proposé :</strong> ${parsed.sujet}</p>
          <p>
            <a href="${siteUrl}/admin/newsletters"
               style="display:inline-block;background:#0f1e38;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Relire et envoyer →
            </a>
          </p>
          <p style="font-size:12px;color:#6b7280;margin-top:16px;">
            Vous recevrez un rappel dans 5 jours si la newsletter n'a pas encore été envoyée.
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[generer-newsletter-draft] notification email failed:', e)
  }

  return NextResponse.json({ ok: true, draftId: draft.id, sujet: parsed.sujet })
}
