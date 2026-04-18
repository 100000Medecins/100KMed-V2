import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const S = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('newsletters')
    .select('contenu_html, sujet')
    .eq('id', id)
    .single()

  if (!data?.contenu_html) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Newsletter introuvable</title></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#6B7280;"><p>Cette newsletter n'existe pas ou n'est plus disponible.</p></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const html = (data.contenu_html as string)
    .replace(/\{\{nom\}\}/g, 'Docteur')
    .replace(/\{\{lien_desabonnement\}\}/g, `${S}/mon-compte/mes-notifications`)
    .replace(/\{\{lien_navigateur\}\}/g, `${S}/nl/${id}`)

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
