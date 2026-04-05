'use server'

export interface EditeurSuggestion {
  nom: string
  nom_commercial: string | null
  description: string | null
  website: string | null
  contact_email: string | null
  contact_telephone: string | null
  contact_adresse: string | null
  contact_cp: string | null
  contact_ville: string | null
  contact_pays: string | null
  nb_employes: number | null
  siret: string | null
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

function buildContext(
  frData: Awaited<ReturnType<typeof tavilySearch>>,
  enData: Awaited<ReturnType<typeof tavilySearch>>,
  siteContent: string | null
): string {
  const parts: string[] = []

  if (frData?.answer) parts.push(`[Recherche FR] ${frData.answer}`)
  if (enData?.answer) parts.push(`[Search EN] ${enData.answer}`)

  for (const r of frData?.results ?? []) {
    parts.push(`Source: ${r.url}\n${r.content}`)
  }
  for (const r of enData?.results ?? []) {
    parts.push(`Source: ${r.url}\n${r.content}`)
  }
  if (siteContent) {
    parts.push(`[Contenu site officiel]\n${siteContent}`)
  }

  return parts.join('\n\n').slice(0, 12000)
}

export async function searchEditeurInfo(
  nom: string
): Promise<{ data?: EditeurSuggestion; error?: string }> {
  const tavilyKey = process.env.TAVILY_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!tavilyKey) return { error: 'Clé Tavily manquante dans .env.local' }
  if (!anthropicKey) return { error: 'Clé Anthropic manquante dans .env.local' }

  // 1. Deux recherches en parallèle (FR + EN)
  const [frData, enData] = await Promise.all([
    tavilySearch(`${nom} éditeur logiciel médical site officiel`, tavilyKey),
    tavilySearch(`${nom} medical software company healthcare official site`, tavilyKey),
  ])

  // 2. Si un site officiel est détecté dans les résultats, on l'extrait
  const allUrls = [
    ...(frData?.results ?? []).map((r) => r.url),
    ...(enData?.results ?? []).map((r) => r.url),
  ]
  const officialSiteUrl = allUrls.find((u) => {
    const lower = u.toLowerCase()
    const nomLower = nom.toLowerCase().replace(/\s+/g, '')
    return (
      lower.includes(nomLower) &&
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

  const context = buildContext(frData, enData, siteContent)

  if (!context.trim()) return { error: 'Aucune information trouvée pour cet éditeur.' }

  // 3. Claude structure les données
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
          content: `Tu es un assistant qui extrait des informations structurées sur des éditeurs de logiciels médicaux.

Extrais les informations disponibles sur "${nom}" à partir du contexte ci-dessous.
Génère aussi une description professionnelle courte (2-3 phrases) en français, adaptée à un site comparatif de logiciels médicaux pour médecins.
Si la société est basée au Royaume-Uni ou ailleurs, indique le pays réel.

Contexte :
${context}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni explication. Mets null si une info n'est pas trouvée.

{
  "nom_commercial": "nom de marque si différent du nom légal, sinon null",
  "description": "description 2-3 phrases en français",
  "website": "URL complète du site officiel ou null",
  "contact_email": "email de contact ou null",
  "contact_telephone": "numéro ou null",
  "contact_adresse": "rue et numéro ou null",
  "contact_cp": "code postal ou null",
  "contact_ville": "ville ou null",
  "contact_pays": "pays ou null",
  "nb_employes": nombre entier ou null,
  "siret": "14 chiffres ou null"
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

    // Logo via Clearbit
    let logo_url: string | null = null
    const site = parsed.website || officialSiteUrl || ''
    if (site) {
      try {
        const domain = new URL(site).hostname.replace(/^www\./, '')
        logo_url = `https://logo.clearbit.com/${domain}`
      } catch {
        // URL invalide
      }
    }

    return {
      data: {
        nom,
        nom_commercial: parsed.nom_commercial ?? null,
        description: parsed.description ?? null,
        website: parsed.website ?? null,
        contact_email: parsed.contact_email ?? null,
        contact_telephone: parsed.contact_telephone ?? null,
        contact_adresse: parsed.contact_adresse ?? null,
        contact_cp: parsed.contact_cp ?? null,
        contact_ville: parsed.contact_ville ?? null,
        contact_pays: parsed.contact_pays ?? null,
        nb_employes: parsed.nb_employes ?? null,
        siret: parsed.siret ?? null,
        logo_url,
      },
    }
  } catch {
    return { error: 'Impossible de parser la réponse de Claude.' }
  }
}
