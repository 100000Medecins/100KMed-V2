// Envoie un email de test en utilisant un vrai template Supabase
// Le logo est désormais baked dans le template (URL absolue) — pas d'injection ici
// Usage : node scripts/send-test-logo.mjs [template_id]
// Ex    : node scripts/send-test-logo.mjs relance_1an

import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const SENDGRID_API_KEY = env['SENDGRID_API_KEY']
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const TO = 'david.azerad@100000medecins.org'

const templateId = process.argv[2] || 'relance_1an'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Valeurs fictives pour remplacer les variables
const sampleValues = {
  nom: 'AZERAD',
  prenom: 'David',
  solution_nom: 'MonLogiciel Pro',
  lien_1clic: 'https://www.100000medecins.org',
  lien_reevaluation: 'https://www.100000medecins.org',
  lien_desabonnement: 'https://www.100000medecins.org',
  lien_desabonnement_etude: 'https://www.100000medecins.org',
  lien_questionnaire: 'https://www.100000medecins.org',
  psc_link: 'https://www.100000medecins.org',
  lien_reinitialisation: 'https://www.100000medecins.org',
  lien_reprise: 'https://www.100000medecins.org',
  relance_num: '1',
  max_relances: '3',
  texte_promoteur: 'Description de l\'étude ou du questionnaire.',
  lien_etude: 'https://www.100000medecins.org',
}

const { data: template, error } = await supabase
  .from('email_templates')
  .select('sujet, contenu_html')
  .eq('id', templateId)
  .single()

if (error || !template) {
  console.error('❌ Template introuvable :', templateId, error?.message)
  process.exit(1)
}

const html = template.contenu_html.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleValues[key] ?? `{{${key}}}`)
const sujet = `[TEST — ${templateId}] ${template.sujet}`

sgMail.setApiKey(SENDGRID_API_KEY)
await sgMail.send({
  to: TO,
  from: 'contact@100000medecins.org',
  subject: sujet,
  html,
})

console.log(`✅ Email test envoyé à ${TO}`)
console.log(`   Template : ${templateId}`)
console.log(`   Sujet    : ${sujet}`)
