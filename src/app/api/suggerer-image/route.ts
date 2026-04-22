import { NextResponse } from 'next/server'

export type UnsplashPhoto = {
  id: string
  thumb_url: string
  small_url: string
  regular_url: string
  photographer: string
  photographer_url: string
  alt: string
  source: 'unsplash' | 'pexels'
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
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: `You are helping find a striking cover image for a French medical blog article.

Article title: "${titre}"

Return 4-5 English keywords for an image search. Think visually and conceptually — go beyond literal medical imagery. Consider metaphors, settings, moods, and atmospheres that could make a powerful cover photo.

Examples of good thinking:
- "Administrative burden on doctors" → "paperwork desk overwhelm office bureaucracy"
- "Telemedicine adoption" → "video call laptop screen remote connection"
- "Doctor shortage in rural areas" → "empty waiting room rural isolation absence"
- "Digital health regulation" → "law books gavel compliance digital rules"
- "Medical software usability" → "frustrated person computer screen interface workflow"

Return ONLY the keywords separated by spaces. No punctuation, no explanation.`,
        },
      ],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? titre
}

async function searchUnsplash(keywords: string): Promise<UnsplashPhoto[]> {
  if (!process.env.UNSPLASH_ACCESS_KEY) return []
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=16&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
  )
  if (!res.ok) throw new Error(`Unsplash error: ${await res.text()}`)
  const data = await res.json()
  return (data.results ?? []).map((p: Record<string, any>) => ({
    id: `u_${p.id}`,
    thumb_url: p.urls.thumb,
    small_url: p.urls.small,
    regular_url: p.urls.regular,
    photographer: p.user.name,
    photographer_url: `${p.user.links.html}?utm_source=100000medecins&utm_medium=referral`,
    alt: p.alt_description ?? keywords,
    source: 'unsplash' as const,
  }))
}

async function searchPexels(keywords: string): Promise<UnsplashPhoto[]> {
  if (!process.env.PEXELS_API_KEY) return []
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=16&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY } }
  )
  if (!res.ok) throw new Error(`Pexels error: ${await res.text()}`)
  const data = await res.json()
  return (data.photos ?? []).map((p: Record<string, any>) => ({
    id: `p_${p.id}`,
    thumb_url: p.src.tiny,
    small_url: p.src.medium,
    regular_url: p.src.large,
    photographer: p.photographer,
    photographer_url: p.photographer_url,
    alt: p.alt ?? keywords,
    source: 'pexels' as const,
  }))
}

export async function POST(req: Request) {
  const { titre, provider = 'unsplash' } = await req.json()

  if (!titre?.trim()) {
    return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 500 })
  }

  const keywords = await extractKeywords(titre)

  try {
    const photos = provider === 'pexels'
      ? await searchPexels(keywords)
      : await searchUnsplash(keywords)

    return NextResponse.json({ photos, keywords })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur de recherche' }, { status: 500 })
  }
}
