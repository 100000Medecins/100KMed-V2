import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { buildEmail } from '@/lib/actions/emailTemplates'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

const DEFAULT_TEST_EMAIL = 'david.azerad@100000medecins.org'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

// Variables fictives injectées pour chaque type de template
const SAMPLE_VARS: Record<string, Record<string, string>> = {
  relance_1an: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', solution_nom: 'MonLogiciel Pro',
    lien_1clic: '#', lien_reevaluation: '#', lien_desabonnement: '#',
  },
  relance_3mois: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', solution_nom: 'MonLogiciel Pro',
    lien_1clic: '#', lien_reevaluation: '#', lien_desabonnement: '#',
  },
  relance_incomplet: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', solution_nom: 'MonLogiciel Pro',
    lien_reprise: '#', lien_desabonnement: '#',
  },
  relance_psc: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', solution_nom: 'MonLogiciel Pro',
    psc_link: '#', lien_desabonnement: '#',
  },
  verification_psc: { psc_link: '#' },
  suppression_compte: { nom: 'DUPONT', prenom: 'Marie' },
  reinitialisation_mot_de_passe: { lien_reinitialisation: '#' },
  fusion_comptes: { lien_fusion: '#' },
  confirmation_inscription: { lien_confirmation: '#' },
  confirmation_changement_email: { lien_confirmation: '#', nouvelle_adresse: 'nouvelle@email.com' },
  notification_changement_email: { ancienne_adresse: 'ancienne@email.com', nouvelle_adresse: 'nouvelle@email.com', lien_contact: '#' },
  infos_mensuels: { nom: 'Dr. DUPONT', prenom: 'Marie', lien_desabonnement: '#' },
  lancement: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', solution_nom: 'MonLogiciel Pro',
    lien_1clic: '#', lien_reevaluation: '#', lien_desabonnement: '#',
  },
  etude_clinique: {
    nom: 'Dr. DUPONT', lien_etude: '#',
    texte_promoteur: 'Exemple de texte fourni par le promoteur de l\'étude clinique.',
    lien_desabonnement: '#',
  },
  questionnaire_recherche: {
    nom: 'Dr. DUPONT', lien_etude: '#',
    texte_promoteur: 'Exemple de texte fourni par le promoteur du questionnaire.',
    lien_desabonnement: '#',
  },
  master_layout: {
    contenu: '<div style="font-family:sans-serif;color:#333;padding:24px;"><h2>Exemple de contenu</h2><p>Ceci est un aperçu du layout avec un contenu fictif injecté à la place de <code>{{contenu}}</code>.</p></div>',
  },
  bac_a_sable: {
    nom: 'Dr. DUPONT', prenom: 'Dr. DUPONT', lien_1clic: '#',
  },
}

export async function POST(req: NextRequest) {
  try { await assertAdmin() } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { templateId, testEmail } = body as { templateId?: string; testEmail?: string }

  if (!templateId) {
    return NextResponse.json({ error: 'templateId manquant' }, { status: 400 })
  }

  const siteUrl = new URL(req.url).origin
  const to = (testEmail?.trim()) || DEFAULT_TEST_EMAIL

  // Pour que le preview soit fidèle, on génère un vrai lien HMAC pour le destinataire
  // si on le retrouve dans la base — sinon fallback vers la page loggée.
  let lienDesabonnement = `${siteUrl}/mon-compte/mes-notifications`
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recipient } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('email', to)
    .maybeSingle()
  if (recipient?.id) {
    lienDesabonnement = generateUnsubscribeLink(recipient.id, siteUrl)
  }

  // Bac à sable : on teste un layout alternatif (master_layout_test) avec un
  // contenu de démo (template "bac_a_sable" en BDD) — sans toucher au layout
  // de production.
  const isMasterLayoutTest = templateId === 'master_layout_test'
  const effectiveTemplateId = isMasterLayoutTest ? 'bac_a_sable' : templateId
  const effectiveLayoutId = isMasterLayoutTest ? 'master_layout_test' : 'master_layout'

  const baseVars = SAMPLE_VARS[effectiveTemplateId] ?? SAMPLE_VARS[templateId] ?? {}
  const vars = 'lien_desabonnement' in baseVars
    ? { ...baseVars, lien_desabonnement: lienDesabonnement }
    : baseVars
  const result = await buildEmail(effectiveTemplateId, vars, siteUrl, effectiveLayoutId)

  if (!result) {
    return NextResponse.json({ error: `Template "${templateId}" introuvable ou vide en base de données.` }, { status: 404 })
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to,
      from: EMAIL_SENDER,
      subject: `[TEST] ${result.sujet}`,
      html: result.html,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sentTo: to })
}
