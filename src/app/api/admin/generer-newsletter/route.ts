import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildNewsletterHtml } from '@/lib/email/newsletter-template'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function POST(req: Request) {
  const { promptUtilisateur } = await req.json()

  const supabase = createServiceRoleClient()
  const now = new Date()
  const yearMonth = now.toISOString().slice(0, 7)
  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const today = now.toISOString().slice(0, 10)

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

  // Résumés pour Claude
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
    model: 'claude-sonnet-4-6',
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

${promptUtilisateur?.trim() ? `INSTRUCTIONS SPÉCIFIQUES DE L'ADMIN :\n${promptUtilisateur.trim()}` : ''}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks, sans commentaires) avec exactement ces 4 champs :
- "sujet" : objet de l'email, accrocheur, moins de 70 caractères, sans mention du mois
- "intro" : paragraphe d'introduction après "Bonjour {{nom}},", 2-3 phrases max, chaleureux et engageant, mentionne brièvement les contenus du mois si pertinent
- "conclusion" : phrase d'accroche pour la section "Votre avis compte", 1-2 phrases max, motivante et sobre
- "nouveautes" : si des nouveautés techniques sont mentionnées dans le changelog, reformule en 2-3 phrases bénéfices utilisateur (sans termes techniques). Sinon laisse ""`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: { sujet: string; intro: string; conclusion: string; nouveautes: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Réponse Claude invalide.', raw }, { status: 500 })
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

  // Upsert : remplace le brouillon du mois si existant, sinon crée
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draft, error } = await (supabase as any)
    .from('newsletters')
    .upsert(
      { mois: yearMonth, sujet: parsed.sujet, contenu_html: contenuHtml, status: 'draft' },
      { onConflict: 'mois' }
    )
    .select('id, mois, sujet, contenu_html, status, created_at, sent_at, recipient_count, notified_at, reminded_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, newsletter: draft })
}
