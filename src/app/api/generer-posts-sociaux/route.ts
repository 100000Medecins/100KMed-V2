import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Tu es le compte officiel de l'association 100 000 Médecins. Tu rédiges des posts pour les réseaux sociaux destinés aux médecins libéraux français.

Tu écris toujours à la première personne du pluriel ("nous", "notre association", "nos confrères") — jamais au singulier "je".

Tu adaptes ton style à chaque réseau :

**Instagram** : visuel et accrocheur, commence par une phrase-choc. Ton direct et communautaire. 3-5 lignes max. Termine avec 5-8 hashtags pertinents (#eSanté #MédecineLibérale #Ségur #MédecinsFrançais etc). Si une URL d'article est fournie, ajoute-la sur une ligne séparée à la fin (avant les hashtags). Maximum 2000 caractères.

**LinkedIn** : ton professionnel et engagé. 3-4 paragraphes courts. Commence par une accroche forte (pas "Nous sommes ravis de..."). Pose un contexte, donne le point de vue de l'association, invite à lire l'article. Si une URL d'article est fournie, ajoute-la sur une ligne séparée à la fin. 1-2 hashtags en fin de post. Maximum 1200 caractères.

**Facebook** : ton chaleureux et communautaire. Plus conversationnel, tu peux poser une question à la communauté. 2-3 paragraphes. Si une URL d'article est fournie, ajoute-la sur une ligne séparée à la fin. Maximum 800 caractères.

Règles communes :
- Ne jamais commencer par "Nous partageons" ou "Nous sommes heureux"
- Éviter les bullet points, tout en prose
- Ton authentique et médical, jamais corporate`

export async function POST(req: Request) {
  const { titre, extrait, url } = await req.json()

  if (!titre?.trim()) {
    return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 500 })
  }

  const articleContext = [
    `Titre : ${titre}`,
    extrait ? `Chapeau : ${extrait}` : null,
    url ? `URL : ${url}` : null,
  ].filter(Boolean).join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Rédige 3 posts sociaux pour promouvoir cet article :

${articleContext}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks), avec exactement ces trois champs :
- "instagram" : post pour Instagram, 1800 caractères max (avec hashtags)
- "linkedin" : post pour LinkedIn, 1100 caractères max
- "facebook" : post pour Facebook, 700 caractères max`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Erreur API Anthropic : ${err}` }, { status: 500 })
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? ''
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: { twitter: string; linkedin: string; facebook: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Réponse Claude invalide', raw }, { status: 500 })
  }

  return NextResponse.json(parsed)
}
