import { NextResponse } from 'next/server'
import { genererArticle, type LongueurArticle } from '@/lib/ai/article'

export async function POST(req: Request) {
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
