import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'
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
      if (line.startsWith(`## [${yearMonth}`)) {
        inSection = true
      } else if (line.startsWith('## [') && inSection) {
        break
      }
      if (inSection) result.push(line)
    }
    // Limit to 80 lines to keep prompt size reasonable
    return result.slice(0, 80).join('\n').trim()
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const yearMonth = now.toISOString().slice(0, 7) // "2026-04"
  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) // "avril 2026"
  const today = now.toISOString().slice(0, 10)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

  // Skip if newsletter for this month already exists
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
    .or(`date_debut.is.null,date_debut.lte.${today}`)
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
  const etudesText = (etudes ?? []).map((e: any) => [
    `- Titre : ${e.titre}`,
    e.description ? `  Description : ${e.description.slice(0, 250)}` : null,
    e.lien ? `  Lien : ${e.lien}` : null,
    e.date_fin ? `  Date de fin : ${new Date(e.date_fin).toLocaleDateString('fr-FR')}` : null,
  ].filter(Boolean).join('\n')).join('\n\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionnairesText = (questionnaires ?? []).map((q: any) => [
    `- Titre : ${q.titre}`,
    q.description ? `  Description : ${q.description.slice(0, 250)}` : null,
    q.lien ? `  Lien : ${q.lien}` : null,
    q.date_fin ? `  Date de fin : ${new Date(q.date_fin).toLocaleDateString('fr-FR')}` : null,
  ].filter(Boolean).join('\n')).join('\n\n')

  const prompt = `Tu génères la newsletter mensuelle de "100 000 Médecins", une plateforme française permettant aux médecins d'évaluer et comparer des logiciels médicaux (LGC, agenda, IA documentaire, IA scribe, etc.).

Mois concerné : ${moisLabel}
URL du site : ${siteUrl}
Couleurs de marque : navy #0f2a4e, blanc #ffffff, bleu clair #eff6ff, vert clair #f0fdf4.
Style email : CSS inline obligatoire (compatibilité clients mail), cartes avec border-radius 12px, max-width 600px, ton professionnel et engageant (confrères entre eux).

---

ÉTUDES CLINIQUES EN COURS DE RECRUTEMENT :
${etudesText || 'Aucune étude en cours ce mois-ci.'}

---

QUESTIONNAIRES DE THÈSE OUVERTS :
${questionnairesText || 'Aucun questionnaire ce mois-ci.'}

---

NOUVEAUTÉS TECHNIQUES DU MOIS (extrait du changelog interne — reformule en langage utilisateur) :
${changelogText || 'Aucune nouveauté technique à mentionner.'}

---

Génère :
1. UNE ligne commençant par "SUJET:" avec l'objet de l'email (accrocheur, < 70 caractères, ne pas inclure le mois)
2. Puis le HTML complet de l'email (<!DOCTYPE html>...)

Structure du HTML :
- En-tête navy (#0f2a4e) avec "100 000 Médecins" centré en blanc
- Salutation personnalisée : "Bonjour {{nom}}," (laisser la variable telle quelle)
- Si études cliniques disponibles : section "🔬 Études cliniques en cours" avec une carte par étude en fond #f0fdf4, titre en gras #0f2a4e, courte description, bouton vert "En savoir plus →" pointant vers le lien si disponible, sinon vers ${siteUrl}/mon-compte/etudes-cliniques
- Si questionnaires disponibles : section "📋 Questionnaires de thèse" avec une carte par questionnaire en fond #eff6ff, titre en gras, description, bouton bleu "Participer →" pointant vers le lien si disponible, sinon vers ${siteUrl}/mon-compte/questionnaires-these
- Section systématique "💬 Votre avis compte" : phrase d'engagement courte (2 lignes max) + bouton navy "Voir mes évaluations" liant vers ${siteUrl}/mon-compte/mes-evaluations
- Si nouveautés techniques : section "🛠 Ce qui a changé ce mois-ci" en fond #f9fafb, reformulée en bénéfices utilisateur (pas de termes techniques, pas de noms de composants)
- Pied de page gris clair, texte centré : "100 000 Médecins · contact@100000medecins.org" et lien de désabonnement {{lien_desabonnement}} (laisser la variable telle quelle)

Contraintes absolues :
- CSS inline uniquement, jamais de balise <style>
- Les variables {{nom}} et {{lien_desabonnement}} doivent rester telles quelles dans le HTML
- Aucun markdown, aucune explication, aucun commentaire — uniquement la ligne SUJET: puis le HTML brut`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text

  // Extract subject line
  const subjectMatch = raw.match(/^SUJET:\s*(.+)/m)
  const sujet = subjectMatch
    ? subjectMatch[1].trim()
    : `Les infos du mois de ${moisLabel} — 100 000 Médecins`

  // Extract HTML (everything from <!DOCTYPE or <html)
  const htmlStart = raw.indexOf('<!DOCTYPE') !== -1 ? raw.indexOf('<!DOCTYPE') : raw.indexOf('<html')
  const contenuHtml = htmlStart !== -1 ? raw.slice(htmlStart) : raw.replace(/^SUJET:.*\n?/m, '').trim()

  // Save draft
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draft, error: insertError } = await (supabase as any)
    .from('newsletters')
    .insert({
      mois: yearMonth,
      sujet,
      contenu_html: contenuHtml,
      status: 'draft',
      notified_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Notify admin
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
          <p><strong>Objet proposé :</strong> ${sujet}</p>
          <p>
            <a href="${siteUrl}/admin/newsletters"
               style="display:inline-block;background:#0f2a4e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
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

  return NextResponse.json({ ok: true, draftId: draft.id, sujet })
}
