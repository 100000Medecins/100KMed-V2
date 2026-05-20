'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export interface AcronymeSuggestion {
  definition: string
  description: string | null
  lien: string | null
  categorie: string | null
  disambiguation: string | null
}

async function tavilySearch(query: string, apiKey: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<{
    answer?: string
    results?: Array<{ title: string; url: string; content: string }>
  }>
}

function buildContext(
  primary: Awaited<ReturnType<typeof tavilySearch>>,
  secondary: Awaited<ReturnType<typeof tavilySearch>>
): string {
  const parts: string[] = []
  if (primary?.answer) parts.push(`[Recherche primaire] ${primary.answer}`)
  if (secondary?.answer) parts.push(`[Recherche secondaire] ${secondary.answer}`)
  for (const r of primary?.results ?? []) parts.push(`Source: ${r.url}\n${r.content}`)
  for (const r of secondary?.results ?? []) parts.push(`Source: ${r.url}\n${r.content}`)
  return parts.join('\n\n').slice(0, 12000)
}

const KNOWN_CATEGORIES = [
  "Téléservices de l'Assurance Maladie",
  'Acteurs et Labels',
]

export async function generateAcronymeInfo(
  sigle: string
): Promise<{ data?: AcronymeSuggestion; error?: string }> {
  await assertAdmin()
  if (!sigle.trim()) return { error: 'Sigle vide' }

  const tavilyKey = process.env.TAVILY_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!tavilyKey) return { error: 'Clé Tavily manquante dans .env.local' }
  if (!anthropicKey) return { error: 'Clé Anthropic manquante dans .env.local' }

  const trimmed = sigle.trim()

  // 2 recherches : contexte santé français + recherche du site officiel
  const [primary, secondary] = await Promise.all([
    tavilySearch(`"${trimmed}" acronyme santé médecine France définition`, tavilyKey),
    tavilySearch(`"${trimmed}" ameli.fr OR esante.gouv.fr OR sesam-vitale.fr OR ans.sante.fr`, tavilyKey),
  ])

  const context = buildContext(primary, secondary)
  if (!context.trim()) return { error: `Aucune information trouvée pour "${trimmed}".` }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [
        {
          name: 'extraire_infos_acronyme',
          description: 'Extrait la définition, une explication pédagogique et un lien officiel pour un sigle médical/santé français.',
          input_schema: {
            type: 'object',
            properties: {
              definition: {
                type: 'string',
                description: 'Développé du sigle (ex. "Dossier Médical Partagé" pour "DMP"). Conserver la casse du sigle (majuscules/minuscules) et les accents. Si le sigle n\'est PAS un acronyme classique (ex. "Téléservices CNAM \\"de base\\""), reformuler en titre clair.',
              },
              description: {
                type: 'string',
                description: 'Explication pédagogique en 1-2 phrases courtes, factuelle, destinée à un médecin libéral français. Ce que c\'est, à quoi ça sert concrètement. Pas de jargon marketing, pas de "leader/incontournable/pionnier".',
              },
              lien: {
                type: 'string',
                description: 'URL d\'une source officielle française si possible (.gouv.fr, ameli.fr, sesam-vitale.fr, ans.sante.fr, has-sante.fr…). Sinon Wikipédia FR. Sinon null. Toujours vérifier que l\'URL apparaît littéralement dans les sources fournies, ne JAMAIS inventer.',
              },
              categorie: {
                type: 'string',
                description: `Une des catégories existantes : ${KNOWN_CATEGORIES.map((c) => `"${c}"`).join(', ')}. Si aucune ne convient, en proposer une nouvelle courte (max 4 mots). Sinon null.`,
              },
              disambiguation: {
                type: 'string',
                description: 'À renseigner UNIQUEMENT si tu sais que ce sigle a plusieurs sens distincts dans l\'écosystème santé français. Court (2-5 mots) pour identifier ce sens-ci. Ex. pour "DNS" : "Bureau du ministère" ou "Agent mobile CNAM". Sinon null.',
              },
            },
            required: ['definition'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'extraire_infos_acronyme' },
      messages: [
        {
          role: 'user',
          content: `Tu remplis une entrée de glossaire pour un site comparatif de logiciels médicaux destiné aux médecins libéraux français.

Sigle à documenter : "${trimmed}"

Style éditorial : factuel, direct, sans jargon marketing. Tu parles à des médecins qui veulent comprendre rapidement ce que veut dire un sigle qu'ils croisent dans la documentation d'un logiciel.

IMPORTANT pour le champ "lien" :
- Préférer dans cet ordre : site officiel français (ameli.fr, sesam-vitale.fr, esante.gouv.fr, ans.sante.fr, has-sante.fr, .gouv.fr) > Wikipédia FR > null
- NE JAMAIS inventer une URL. Si tu n'es pas sûr qu'elle existe dans les sources ci-dessous, mets null.
- Si plusieurs sources officielles, choisir la plus spécifique au sigle (pas la home page générique).

Contexte de recherche web :
${context}`,
        },
      ],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    return { error: `Erreur Claude API : ${claudeRes.status} — ${err.slice(0, 200)}` }
  }

  const claudeData = await claudeRes.json()

  try {
    const toolUse = claudeData.content?.find((b: { type: string }) => b.type === 'tool_use')
    const parsed = toolUse?.input
    if (!parsed?.definition) return { error: 'Réponse Claude incomplète (pas de définition).' }

    return {
      data: {
        definition: parsed.definition,
        description: parsed.description ?? null,
        lien: parsed.lien ?? null,
        categorie: parsed.categorie ?? null,
        disambiguation: parsed.disambiguation ?? null,
      },
    }
  } catch {
    return { error: 'Impossible de parser la réponse de Claude.' }
  }
}
