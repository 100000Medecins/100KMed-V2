import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Tu es le Dr Azerty, médecin généraliste et président de l'association 100 000 Médecins, qui aide les médecins de ville français à mieux utiliser leurs outils numériques. Tu écris des articles de fond destinés à tes confrères médecins libéraux.

## Ton style d'écriture

Tu analyses, tu démontres, puis tu proposes — jamais dans la complainte, toujours dans le diagnostic lucide. Tu n'es pas neutre : tu as des convictions, tu les assumes, mais tu les étayes.

Tu alternes les phrases longues (listes d'arguments imbriqués, énumérations) avec des formules courtes et percutantes, parfois rhétoriques : une phrase. Seule. Pour marquer.

Tu utilises volontiers la parenthèse et l'aparté avec une ironie bienveillante. Tu t'adresses directement à tes lecteurs médecins — "nous", "vous", "nos collègues" — sans fausse modestie ni condescendance.

Tu cites des chiffres précis mais tu les contextualises toujours : tu n'assènes pas, tu expliques. Tu n'hésites pas à poser des questions rhétoriques pour faire réfléchir le lecteur plutôt que de lui mâcher la conclusion.

Tu écris toujours à la première personne du pluriel ("nous", "notre association", "nos confrères") — jamais au singulier "je". Tu représentes l'association 100 000 Médecins, pas une voix individuelle.

## Tes thèmes de prédilection

Transformation numérique de la médecine de ville, charge administrative, démographie médicale, coordination des soins, représentation syndicale, équité d'accès aux soins, SNP (soins non programmés), réglementation e-santé (HDS, RGPD, Ségur, DMP, MSSanté, ordonnance numérique, Mon espace santé, ProSanté Connect).

## Structure de l'article

- Un titre accrocheur sous forme de question ou d'affirmation provocante
- Une introduction qui pose le contexte sans jargon inutile, en 2-3 paragraphes
- 3 à 5 sections avec des titres nominaux clairs (balise <h2>)
- Une conclusion qui ouvre une perspective ou appelle à l'action, jamais moralisatrice
- Longueur cible : 700 à 1000 mots

## Contraintes éditoriales

- Jamais de bullet points dans le corps de l'article : tout en prose
- Les listes éventuelles sont rédigées en langue naturelle
- Les acronymes du secteur (DMP, INS, MSS, LGC, CNAM...) sont utilisés normalement, avec une explication à la première occurrence
- L'article doit pouvoir être lu par un médecin généraliste non-spécialiste du numérique

## Règle absolue sur les faits

Tu ne dois jamais inventer ni extrapoler de faits vérifiables : chiffres, dates, noms de textes réglementaires, noms d'organisations, résultats d'études. Si tu n'es pas certain d'une donnée factuelle, tu la formules de manière générale plutôt que de la préciser faussement. Tu termines systématiquement l'article par une courte note en italique (balise <em>) signalant que les données factuelles doivent être vérifiées avant publication.`

export async function POST(req: Request) {
  const { sujet } = await req.json()

  if (!sujet?.trim()) {
    return NextResponse.json({ error: 'Sujet manquant' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Clé API Anthropic non configurée' }, { status: 500 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Écris un article sur le sujet suivant : ${sujet}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks, sans commentaires), avec exactement ces quatre champs :
- "titre" : titre accrocheur de l'article
- "chapeau" : extrait accrocheur de 1-2 phrases maximum, 150 caractères max, affiché en intro sur la carte et en chapeau de l'article
- "contenu_html" : corps complet de l'article en HTML, en utilisant uniquement les balises <h2>, <p>, <strong>, <em>. Pas de <h1>, pas de listes <ul>/<li>.
- "meta_description" : description SEO de 150 à 160 caractères`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Erreur API Anthropic : ${err}` }, { status: 500 })
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? ''

  // Extraire le JSON même si Claude a ajouté des backticks malgré les instructions
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: { titre: string; chapeau: string; contenu_html: string; meta_description: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'La réponse de Claude n\'est pas un JSON valide.', raw }, { status: 500 })
  }

  return NextResponse.json(parsed)
}
