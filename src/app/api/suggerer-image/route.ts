import { NextResponse } from 'next/server'

export type UnsplashPhoto = {
  id: string
  thumb_url: string
  regular_url: string
  photographer: string
  photographer_url: string
  alt: string
}

async function extractKeywords(titre: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `You are helping find Unsplash cover images for a French medical blog about digital health and medical software for general practitioners.

The article title is: "${titre}"

Return 2-3 English keywords for an Unsplash photo search that visually represent the THEME (not the proper nouns). Focus on concepts like: doctor, stethoscope, medical, healthcare, technology, computer, digital, hospital, patient, health — depending on what fits.

Return ONLY the keywords separated by spaces, nothing else.`,
        },
      ],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? titre
}

export async function POST(req: Request) {
  const { titre } = await req.json()

  if (!titre?.trim()) {
    return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ error: 'Clé API Unsplash non configurée (UNSPLASH_ACCESS_KEY)' }, { status: 500 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 500 })
  }

  const keywords = await extractKeywords(titre)

  const unsplashRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=8&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    }
  )

  if (!unsplashRes.ok) {
    const err = await unsplashRes.text()
    return NextResponse.json({ error: `Erreur Unsplash : ${err}` }, { status: 500 })
  }

  const unsplashData = await unsplashRes.json()

  const photos: UnsplashPhoto[] = (unsplashData.results ?? []).map((p: Record<string, any>) => ({
    id: p.id,
    thumb_url: p.urls.thumb,
    regular_url: p.urls.regular,
    photographer: p.user.name,
    photographer_url: `${p.user.links.html}?utm_source=100000medecins&utm_medium=referral`,
    alt: p.alt_description ?? keywords,
  }))

  return NextResponse.json({ photos, keywords })
}
