import { NextResponse } from 'next/server'
import { genererArticle, type LongueurArticle } from '@/lib/ai/article'
import { estAdminOuContenu } from '@/lib/auth/admin-guard'

export async function POST(req: Request) {
  if (!(await estAdminOuContenu())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { sujet, longueur = 'article' } = await req.json()

  const resultat = await genererArticle(sujet, longueur as LongueurArticle)

  if (!resultat.ok) {
    // « Sujet manquant » est une erreur de requête, le reste vient du modèle ou de la config.
    const status = resultat.error === 'Sujet manquant' ? 400 : 500
    return NextResponse.json(
      resultat.raw ? { error: resultat.error, raw: resultat.raw } : { error: resultat.error },
      { status }
    )
  }

  return NextResponse.json(resultat.article)
}
