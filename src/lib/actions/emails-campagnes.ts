'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildEmail } from '@/lib/actions/emailTemplates'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import sgMail from '@sendgrid/mail'

export type EmailCampagne = {
  id: string
  type: 'questionnaire' | 'etude'
  ref_id: string
  titre: string
  statut: 'pending' | 'sent' | 'cancelled'
  specialites_cibles: string[]
  lien: string | null
  texte_promoteur: string | null
  envoye_a: number | null
  total: number | null
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

function normalise(row: any): EmailCampagne {
  return {
    ...row,
    specialites_cibles: Array.isArray(row.specialites_cibles) ? row.specialites_cibles : [],
  }
}

export async function getEmailsCampagnes(): Promise<{ etudes: EmailCampagne[]; questionnaires: EmailCampagne[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { data } = await supabase
    .from('emails_campagnes')
    .select('*')
    .order('created_at', { ascending: false })

  const all: EmailCampagne[] = (data ?? []).map(normalise)
  return {
    etudes: all.filter((c) => c.type === 'etude'),
    questionnaires: all.filter((c) => c.type === 'questionnaire'),
  }
}

export async function cancelEmailCampagne(id: string): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase
    .from('emails_campagnes')
    .update({ statut: 'cancelled' })
    .eq('id', id)
    .eq('statut', 'pending')
  return { error: error?.message ?? null }
}

export async function scheduleCampagne(
  type: 'questionnaire' | 'etude',
  config: {
    refId: string
    titre: string
    lien: string
    textePromoteur: string
    specialitesCibles: string[]
    scheduledAt: string
  }
): Promise<{ campagneId: string | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { refId, titre, lien, textePromoteur, specialitesCibles, scheduledAt } = config

  const { data, error } = await supabase
    .from('emails_campagnes')
    .insert({
      type,
      ref_id: refId,
      titre,
      statut: 'pending',
      specialites_cibles: specialitesCibles,
      lien,
      texte_promoteur: textePromoteur,
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single()

  return { campagneId: data?.id ?? null, error: error?.message ?? null }
}

export async function genererTexteEmail(
  type: 'questionnaire' | 'etude',
  titre: string,
  description?: string | null
): Promise<{ html: string | null; error: string | null }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { html: null, error: 'Clé API Anthropic non configurée' }
  }

  const contexte = type === 'etude'
    ? "une étude clinique à laquelle des médecins peuvent participer"
    : "un questionnaire de thèse de médecine"

  const descriptionPart = description
    ? `\n\nDescription : ${description.replace(/<[^>]*>/g, '').trim().slice(0, 500)}`
    : ''

  const prompt = `Génère un texte court pour un email envoyé à des médecins pour les inviter à participer à ${contexte}.

Titre : ${titre}${descriptionPart}

Contraintes :
- 2 à 3 phrases maximum, ton professionnel et bienveillant
- Mettre en avant l'utilité pour la communauté médicale
- Inciter à cliquer sur le lien (qui sera ajouté automatiquement)
- Pas de formule de politesse, pas de signature
- Répondre UNIQUEMENT avec du HTML simple : balises <p> et <strong> uniquement, sans attributs`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const json = await response.json()
    const html = json.content?.[0]?.text?.trim() ?? null
    return { html, error: html ? null : 'Réponse vide du modèle' }
  } catch (e) {
    return { html: null, error: String(e) }
  }
}

export async function sendCampagneNow(
  type: 'questionnaire' | 'etude',
  config: {
    refId: string
    titre: string
    lien: string
    textePromoteur: string
    specialitesCibles: string[]
  }
): Promise<{ sent: number; total: number; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org'
  const { refId, titre, lien, textePromoteur, specialitesCibles } = config

  const prefKey = type === 'etude' ? 'etudes_cliniques' : 'questionnaires_these'
  const templateId = type === 'etude' ? 'etude_clinique' : 'questionnaire_recherche'

  const { data: prefs } = await supabase
    .from('users_notification_preferences')
    .select('user_id')
    .eq(prefKey, true)

  const userIds = (prefs ?? []).map((p: any) => p.user_id)
  let query = supabase
    .from('users')
    .select('id, email, nom, specialite')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  if (specialitesCibles.length > 0) {
    query = query.in('specialite', specialitesCibles)
  }

  const { data: users } = await query
  const total = (users ?? []).length
  let sent = 0

  if (total > 0) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
    for (const user of users ?? []) {
      if (!user.email) continue
      try {
        const nomDisplay = user.nom ? `Dr. ${user.nom}` : 'Docteur'
        const result = await buildEmail(templateId, {
          nom: nomDisplay,
          lien_etude: lien,
          texte_promoteur: textePromoteur,
          lien_desabonnement: generateUnsubscribeLink(user.id, siteUrl),
        }, siteUrl)
        if (!result) continue
        await sgMail.send({
          to: user.email,
          from: 'contact@100000medecins.org',
          subject: result.sujet,
          html: result.html,
        })
        sent++
      } catch { /* best-effort */ }
    }
  }

  await supabase.from('emails_campagnes').insert({
    type,
    ref_id: refId,
    titre,
    statut: 'sent',
    specialites_cibles: specialitesCibles,
    lien,
    texte_promoteur: textePromoteur,
    envoye_a: sent,
    total,
    sent_at: new Date().toISOString(),
  })

  return { sent, total, error: null }
}
