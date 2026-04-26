import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const ANTHROPIC_BODY = (prompt: string) => JSON.stringify({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 256,
  messages: [{ role: 'user', content: prompt }],
})

function parseAiText(text: string): { title: string; description: string } | null {
  try {
    // Retire les éventuels blocs markdown ```json ... ```
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch {
    return null
  }
}

async function callAnthropic(prompt: string, apiKey: string): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: ANTHROPIC_BODY(prompt),
  })
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 500 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const supabase = createServiceRoleClient()

  const { data: sol, error } = await supabase
    .from('solutions')
    .select(`
      id, nom, description, meta,
      evaluation_redac_points_forts,
      editeur:editeurs(nom),
      categorie:categories(nom)
    `)
    .eq('id', id)
    .single()

  if (error || !sol) return NextResponse.json({ error: 'Solution introuvable' }, { status: 404 })

  // Récupère les tags principaux pour contexte
  const { data: tagRows } = await supabase
    .from('solutions_tags')
    .select('id_tag')
    .eq('id_solution', id)
    .eq('is_tag_principal', true)

  let tagNames: string[] = []
  if (tagRows && tagRows.length > 0) {
    const tagIds = tagRows.map((r) => r.id_tag).filter(Boolean) as string[]
    const { data: tagsData } = await supabase
      .from('tags')
      .select('nom_court, nom_capital')
      .in('id', tagIds)
    tagNames = (tagsData || [])
      .map((t: any) => t.nom_capital || t.nom_court)
      .filter(Boolean) as string[]
  }

  const categorie = (sol.categorie as { nom: string | null } | null)?.nom ?? ''
  const editeur = (sol.editeur as { nom: string | null } | null)?.nom ?? ''
  const description = (sol.description as string | null) ?? ''
  const pointsForts = Array.isArray(sol.evaluation_redac_points_forts)
    ? (sol.evaluation_redac_points_forts as string[]).slice(0, 3).join(', ')
    : ''

  const prompt = `Tu génères des métadonnées SEO pour la page d'évaluation d'un outil numérique médical sur le site 100 000 Médecins, destiné aux médecins libéraux français.

Logiciel : ${sol.nom}
Catégorie : ${categorie}${editeur ? `\nÉditeur : ${editeur}` : ''}${description ? `\nDescription : ${description.substring(0, 500)}` : ''}${tagNames.length > 0 ? `\nFonctionnalités clés : ${tagNames.join(', ')}` : ''}${pointsForts ? `\nPoints forts : ${pointsForts}` : ''}

Génère :
1. Un meta title (max 60 caractères) : doit contenir le nom du logiciel et les mots "avis" et "médecins". Utilise la catégorie réelle comme mot-clé (ex : "agenda médical", "IA scribe", "IA documentaire", "logiciel métier" uniquement si la catégorie l'est vraiment). Structure recommandée : "{Nom} — Avis médecins | {catégorie}". Adapte si le nom est long.
2. Une meta description (max 155 caractères) : décrit l'outil en lien avec sa catégorie réelle, mentionne les avis authentiques de médecins et invite à consulter la fiche. N'utilise jamais "logiciel métier" ou "lgc" si la catégorie est une IA, un agenda, ou autre chose.

Ne mentionne que des faits présents dans les données ci-dessus. Réponds UNIQUEMENT en JSON valide sans markdown :
{"title": "...", "description": "..."}`

  const apiKey = process.env.ANTHROPIC_API_KEY!
  let response = await callAnthropic(prompt, apiKey)

  // Retry automatique sur rate-limit ou erreur serveur
  if (response.status === 429 || response.status >= 500) {
    await new Promise((r) => setTimeout(r, 2500))
    response = await callAnthropic(prompt, apiKey)
  }

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Erreur Anthropic : ${err}` }, { status: 500 })
  }

  const aiResult = await response.json()
  const text: string = aiResult.content?.[0]?.text ?? ''

  const parsed = parseAiText(text)
  if (!parsed?.title || !parsed?.description) {
    return NextResponse.json({ error: 'Réponse IA non parseable', raw: text }, { status: 500 })
  }

  // Sauvegarde dans la colonne meta (JSON), en préservant le canonical existant
  const currentMeta = (sol.meta as Record<string, string | null> | null) ?? {}
  const newMeta = { ...currentMeta, title: parsed.title, description: parsed.description }

  await supabase.from('solutions').update({ meta: newMeta }).eq('id', id)

  return NextResponse.json({ title: parsed.title, description: parsed.description })
}
