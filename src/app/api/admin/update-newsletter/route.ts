import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildNewsletterHtml } from '@/lib/email/newsletter-template'
import type { NewsletterContent } from '@/lib/email/newsletter-template'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { id, sujet, intro, accroche_article_1, accroche_article_2, conclusion, nouveautes } = await req.json()

  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const supabase = createServiceRoleClient()

  // Récupérer le contenu_json existant pour ne modifier que les champs texte
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('newsletters')
    .select('contenu_json')
    .eq('id', id)
    .eq('status', 'draft')
    .single()

  if (!existing) return NextResponse.json({ error: 'Brouillon introuvable' }, { status: 404 })

  const prevJson = existing.contenu_json ?? {}

  // Mettre à jour les accroches dans les articles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (prevJson.articles ?? []).map((a: any, i: number) => ({
    ...a,
    accroche: i === 0 ? (accroche_article_1 ?? a.accroche) : (accroche_article_2 ?? a.accroche),
  }))

  const newJson: NewsletterContent = {
    ...prevJson,
    sujet: sujet ?? prevJson.sujet,
    intro: intro ?? prevJson.intro,
    conclusion: conclusion ?? prevJson.conclusion,
    nouveautes: nouveautes ?? prevJson.nouveautes,
    articles,
  }

  const contenuHtml = buildNewsletterHtml(newJson)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('newsletters')
    .update({ sujet: newJson.sujet, contenu_html: contenuHtml, contenu_json: newJson })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, contenu_html: contenuHtml })
}
