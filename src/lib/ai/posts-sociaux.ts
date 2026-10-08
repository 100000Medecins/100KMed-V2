/**
 * Rédaction des 3 posts réseaux (Instagram, LinkedIn, Facebook) d'un article ou d'une vidéo.
 *
 * Partagé entre la route `/api/generer-posts-sociaux` et l'action serveur du panneau
 * « Publier sur les réseaux ». Pas `'use server'` (constantes et types synchrones).
 */
import type { Reseau } from '@/lib/reseaux/types'

const SYSTEM_PROMPT = `Tu es le compte officiel de l'association 100 000 Médecins. Tu rédiges des posts pour les réseaux sociaux destinés aux médecins libéraux français.

Tu écris toujours à la première personne du pluriel ("nous", "notre association", "nos confrères") — jamais au singulier "je".

Tu adaptes ton style à chaque réseau :

**Instagram** : visuel et accrocheur, commence par une phrase-choc. Ton direct et communautaire. 3-5 lignes max. Termine avec 5-8 hashtags pertinents (#eSanté #MédecineLibérale #Ségur #MédecinsFrançais etc). Si une URL est fournie, ajoute-la sur une ligne séparée à la fin (avant les hashtags). Maximum 2000 caractères.

**LinkedIn** : ton professionnel et engagé. 3-4 paragraphes courts. Commence par une accroche forte (pas "Nous sommes ravis de..."). Pose un contexte, donne le point de vue de l'association, invite à lire l'article ou à regarder la vidéo. Si une URL est fournie, ajoute-la sur une ligne séparée à la fin. 1-2 hashtags en fin de post. Maximum 1200 caractères.

**Facebook** : ton chaleureux et communautaire. Plus conversationnel, tu peux poser une question à la communauté. 2-3 paragraphes. Si une URL est fournie, ajoute-la sur une ligne séparée à la fin. Maximum 800 caractères.

Règles communes :
- Ne jamais commencer par "Nous partageons" ou "Nous sommes heureux"
- Éviter les bullet points, tout en prose
- Ton authentique et médical, jamais corporate`

export type DemandePosts = {
  type: 'article' | 'video'
  titre: string
  extrait?: string | null
  url?: string | null
}

export type ResultatPosts =
  | { ok: true; posts: Record<Reseau, string> }
  | { ok: false; error: string; raw?: string }

export async function genererPostsSociaux({ type, titre, extrait, url }: DemandePosts): Promise<ResultatPosts> {
  const video = type === 'video'

  if (!titre?.trim()) return { ok: false, error: 'Titre manquant' }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'Clé API Anthropic non configurée' }

  const contexte = [
    `Titre : ${titre}`,
    // Description YouTube : souvent longue (chapitres, liens) — le début suffit.
    extrait ? `${video ? 'Description' : 'Chapeau'} : ${extrait.slice(0, 1500)}` : null,
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
          content: `Rédige 3 posts sociaux pour promouvoir ${video ? "cette vidéo YouTube (elle n'est pas forcément réalisée par l'association : ne t'en attribue pas la réalisation si la description ne le dit pas)" : 'cet article'} :

${contexte}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks), avec exactement ces trois champs :
- "instagram" : post pour Instagram, 1800 caractères max (avec hashtags)
- "linkedin" : post pour LinkedIn, 1100 caractères max
- "facebook" : post pour Facebook, 700 caractères max`,
        },
      ],
    }),
  })

  if (!response.ok) return { ok: false, error: `Erreur API Anthropic : ${await response.text()}` }

  const data = await response.json()
  const raw: string = data.content?.[0]?.text ?? ''
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<Record<Reseau, unknown>>
    return {
      ok: true,
      posts: {
        linkedin: String(parsed.linkedin ?? ''),
        facebook: String(parsed.facebook ?? ''),
        instagram: String(parsed.instagram ?? ''),
      },
    }
  } catch {
    return { ok: false, error: 'Réponse Claude invalide', raw }
  }
}
