'use server'

export interface SolutionSuggestion {
  nom: string
  description: string | null
  avis_redac: string | null
  website_url: string | null
  logo_url: string | null
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

async function tavilyExtract(url: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, urls: [url] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.results?.[0]?.raw_content?.slice(0, 3000) ?? null
  } catch {
    return null
  }
}

export async function searchSolutionInfo(
  nom: string,
  editeurNom?: string | null
): Promise<{ data?: SolutionSuggestion; error?: string }> {
  const tavilyKey = process.env.TAVILY_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!tavilyKey) return { error: 'Clé Tavily manquante dans .env.local' }
  if (!anthropicKey) return { error: 'Clé Anthropic manquante dans .env.local' }

  const editeurCtx = editeurNom ? ` par ${editeurNom}` : ''

  const [frData, enData] = await Promise.all([
    tavilySearch(`logiciel médical "${nom}"${editeurCtx} France site officiel`, tavilyKey),
    tavilySearch(`medical software "${nom}"${editeurCtx} healthcare official site`, tavilyKey),
  ])

  // Détection site officiel
  const allUrls = [
    ...(frData?.results ?? []).map((r) => r.url),
    ...(enData?.results ?? []).map((r) => r.url),
  ]
  const nomNorm = nom.toLowerCase().replace(/\s+/g, '')
  const officialSiteUrl = allUrls.find((u) => {
    const lower = u.toLowerCase()
    return (
      lower.includes(nomNorm) &&
      !lower.includes('linkedin') &&
      !lower.includes('youtube') &&
      !lower.includes('facebook') &&
      !lower.includes('twitter') &&
      !lower.includes('wikipedia')
    )
  })

  const siteContent = officialSiteUrl
    ? await tavilyExtract(officialSiteUrl, tavilyKey)
    : null

  const parts: string[] = []
  if (frData?.answer) parts.push(`[Recherche FR] ${frData.answer}`)
  if (enData?.answer) parts.push(`[Search EN] ${enData.answer}`)
  for (const r of frData?.results ?? []) parts.push(`Source: ${r.url}\n${r.content}`)
  for (const r of enData?.results ?? []) parts.push(`Source: ${r.url}\n${r.content}`)
  if (siteContent) parts.push(`[Contenu site officiel]\n${siteContent}`)

  const context = parts.join('\n\n').slice(0, 12000)

  if (!context.trim()) return { error: 'Aucune information trouvée pour ce logiciel.' }

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
      messages: [
        {
          role: 'user',
          content: `Tu es un rédacteur pour un site comparatif de logiciels médicaux destiné aux médecins libéraux français.

Ton style éditorial : factuel, direct, légèrement ironique. Tu évites absolument le jargon marketing ("solution innovante", "révolutionnaire", "au service des professionnels de santé", "plateforme de santé numérique de référence", etc.). Tu parles à des médecins qui ont peu de temps, qui ont déjà vu trop de promesses et qui veulent savoir concrètement ce que fait l'outil, qui l'utilise, et ce qu'il coûte si possible. Pas de superlatifs, pas d'autopromotion recopiée.

Extrais les informations disponibles sur le logiciel "${nom}"${editeurCtx} à partir du contexte ci-dessous.

Génère deux textes distincts :
1. "description" : une phrase, deux maximum. Ultra-concis, factuel, parfois légèrement critique. Exemple : "LGC très répandu en médecine générale, connu pour sa lourdeur et sa longévité." ou "Agenda en ligne pour les cabinets, avec prise de RDV patient et rappels SMS."
2. "avis_redac" : 3-4 phrases dans le style éditorial. Décris ce que fait concrètement le logiciel, qui l'utilise, les points forts réels, et les limites ou points d'attention si perceptibles dans les sources.

Contexte :
${context}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni explication. Mets null si une info n'est pas trouvée.

{
  "description": "1-2 phrases très courtes et factuelles",
  "avis_redac": "3-4 phrases avis éditorial",
  "website_url": "URL complète du site officiel du logiciel ou null"
}`,
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
    const text: string = claudeData.content[0].text.trim()
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)

    // Logo via logo.dev (remplace Clearbit, déprécié)
    let logo_url: string | null = null
    const site = parsed.website_url || officialSiteUrl || ''
    const logoToken = process.env.LOGO_DEV_TOKEN
    if (site) {
      try {
        const domain = new URL(site).hostname.replace(/^www\./, '')
        logo_url = logoToken
          ? `https://img.logo.dev/${domain}?token=${logoToken}&size=200&format=png`
          : `https://logo.clearbit.com/${domain}`
      } catch { /* URL invalide */ }
    }

    return {
      data: {
        nom,
        description: parsed.description ?? null,
        avis_redac: parsed.avis_redac ?? null,
        website_url: parsed.website_url ?? null,
        logo_url,
      },
    }
  } catch {
    return { error: 'Impossible de parser la réponse de Claude.' }
  }
}
