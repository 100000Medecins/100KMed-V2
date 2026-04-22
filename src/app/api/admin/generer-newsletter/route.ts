import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildNewsletterHtml } from '@/lib/email/newsletter-template'
import type { ArticleItem, Item } from '@/lib/email/newsletter-template'
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

  // 2 derniers articles de blog publiés
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articlesRaw } = await (supabase as any)
    .from('articles')
    .select('titre, extrait, slug')
    .eq('statut', 'publié')
    .order('date_publication', { ascending: false })
    .limit(2)

  // 1 seule étude clinique active (la plus récente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: etudesRaw } = await (supabase as any)
    .from('etudes_cliniques')
    .select('titre, description, lien, date_fin')
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)

  // 1 seul questionnaire de thèse ouvert (le plus récent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questionnairesRaw } = await (supabase as any)
    .from('questionnaires_these')
    .select('titre, description, lien, date_fin')
    .eq('statut', 'publie')
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)

  const articles: ArticleItem[] = (articlesRaw ?? []).map((a: ArticleItem) => ({
    titre: a.titre,
    extrait: a.extrait,
    slug: a.slug,
    accroche: null,
  }))
  const etude: Item | null = etudesRaw?.[0] ?? null
  const questionnaire: Item | null = questionnairesRaw?.[0] ?? null
  const changelogText = getChangelogForMonth(yearMonth)

  // Résumés pour Claude
  const articlesText = articles.map((a, i) =>
    `Article ${i + 1} — "${a.titre}"${a.extrait ? '\nExtrait : ' + a.extrait : ''}`
  ).join('\n\n')

  const etudeText = etude
    ? `- ${etude.titre}${etude.description ? ' : ' + etude.description.slice(0, 200) : ''}`
    : 'Aucune étude en cours ce mois-ci.'

  const questionnaireText = questionnaire
    ? `- ${questionnaire.titre}${questionnaire.description ? ' : ' + questionnaire.description.slice(0, 200) : ''}`
    : 'Aucun questionnaire ce mois-ci.'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Tu génères le contenu textuel d'une newsletter mensuelle pour "100 000 Médecins" (${moisLabel}).

Ton rôle : écrire les textes d'accroche — pas le HTML, le design est géré séparément.
Style : enthousiaste, chaleureux, "confrères entre eux", direct et percutant. On est fiers de cette plateforme et on veut que ça se sente.

CONTENU DU MOIS :
Articles de blog publiés ce mois-ci :
${articlesText || 'Aucun article ce mois-ci.'}

Étude clinique ouverte :
${etudeText}

Questionnaire de thèse ouvert :
${questionnaireText}

${changelogText ? `Nouveautés plateforme (reformule en bénéfices utilisateur, sans termes techniques) :\n${changelogText.slice(0, 1500)}` : ''}

${promptUtilisateur?.trim() ? `INSTRUCTIONS SPÉCIFIQUES :\n${promptUtilisateur.trim()}` : ''}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) avec exactement ces champs :
- "sujet" : objet de l'email, accrocheur et enthousiaste, moins de 70 caractères, sans mention du mois
- "intro" : paragraphe d'introduction après "Bonjour {{nom}},", 2-3 phrases, ton enthousiaste, mentionne brièvement les contenus du mois
- "accroche_article_1" : phrase courte et percutante pour introduire le 1er article (question rhétorique ou affirmation forte, 1 phrase max). Laisser "" si pas d'article.
- "accroche_article_2" : idem pour le 2e article. Laisser "" si pas de 2e article.
- "conclusion" : 1-2 phrases pour la section "Votre avis compte", motivantes et sobres
- "nouveautes" : si des nouveautés techniques sont dans le changelog, reformule en 2-3 phrases bénéfices utilisateur. Sinon laisser "".`,
    }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: {
    sujet: string; intro: string
    accroche_article_1: string; accroche_article_2: string
    conclusion: string; nouveautes: string
  }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Réponse Claude invalide.', raw }, { status: 500 })
  }

  // Injecter les accroches dans les articles
  const articlesAvecAccroche: ArticleItem[] = articles.map((a, i) => ({
    ...a,
    accroche: i === 0 ? (parsed.accroche_article_1 || null) : (parsed.accroche_article_2 || null),
  }))

  const contenuJson = {
    sujet: parsed.sujet,
    intro: parsed.intro,
    accroche_article_1: parsed.accroche_article_1,
    accroche_article_2: parsed.accroche_article_2,
    conclusion: parsed.conclusion,
    nouveautes: parsed.nouveautes,
    articles: articlesAvecAccroche,
    etude,
    questionnaire,
    moisLabel,
  }

  const contenuHtml = buildNewsletterHtml({
    sujet: parsed.sujet,
    intro: parsed.intro,
    conclusion: parsed.conclusion,
    nouveautes: parsed.nouveautes,
    articles: articlesAvecAccroche,
    etude,
    questionnaire,
    moisLabel,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draft, error } = await (supabase as any)
    .from('newsletters')
    .upsert(
      { mois: yearMonth, sujet: parsed.sujet, contenu_html: contenuHtml, contenu_json: contenuJson, status: 'draft' },
      { onConflict: 'mois' }
    )
    .select('id, mois, sujet, contenu_html, contenu_json, status, created_at, sent_at, recipient_count, notified_at, reminded_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, newsletter: draft })
}
