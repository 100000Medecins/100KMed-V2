import { NextResponse } from 'next/server'

export type SocialPublishPayload = {
  network: 'linkedin' | 'facebook' | 'instagram'
  text: string
  scheduled_at?: string // ISO 8601
  image_url?: string
  article_url?: string
}

export async function POST(req: Request) {
  if (!process.env.MAKE_WEBHOOK_URL) {
    return NextResponse.json({ error: 'MAKE_WEBHOOK_URL non configuré' }, { status: 500 })
  }

  const payload: SocialPublishPayload = await req.json()

  if (!payload.network || !payload.text?.trim()) {
    return NextResponse.json({ error: 'network et text sont requis' }, { status: 400 })
  }

  try {
    const res = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: payload.network,
        text: payload.text,
        scheduled_at: payload.scheduled_at ?? null,
        image_url: payload.image_url ?? null,
        article_url: payload.article_url ?? null,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Erreur Make.com : ${err}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
  }
}
