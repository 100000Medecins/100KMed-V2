import { NextResponse } from 'next/server'
import { estAdminOuContenu } from '@/lib/auth/admin-guard'
import { genererPostsSociaux } from '@/lib/ai/posts-sociaux'

export async function POST(req: Request) {
  if (!(await estAdminOuContenu())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { type = 'article', titre, extrait, url } = await req.json()
  const resultat = await genererPostsSociaux({ type, titre, extrait, url })

  if (!resultat.ok) {
    const status = resultat.error === 'Titre manquant' ? 400 : 500
    return NextResponse.json(resultat.raw ? { error: resultat.error, raw: resultat.raw } : { error: resultat.error }, { status })
  }

  return NextResponse.json(resultat.posts)
}
