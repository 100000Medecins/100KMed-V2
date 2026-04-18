/**
 * Envoie la newsletter d'avril 2026 à une adresse de test.
 * Usage : node scripts/send-test-newsletter.mjs
 */

import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { URL } from 'url'

// Charger .env.local
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const SENDGRID_API_KEY = env['SENDGRID_API_KEY']
const SITE_URL = env['NEXT_PUBLIC_SITE_URL'] || 'https://www.100000medecins.org'

const TO = 'david.azerad@100000medecins.org'
const MOIS = '2026-04'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const { data: newsletter, error } = await supabase
  .from('newsletters')
  .select('id, sujet, contenu_html, status')
  .eq('mois', MOIS)
  .single()

if (error || !newsletter) {
  console.error('❌ Newsletter introuvable pour', MOIS, error?.message)
  process.exit(1)
}

console.log(`📧 Newsletter trouvée : ${newsletter.id} (${newsletter.status})`)
console.log(`   Sujet : ${newsletter.sujet}`)

const nomDisplay = 'Dr. AZERAD'
const html = (newsletter.contenu_html)
  .replace(/\{\{nom\}\}/g, nomDisplay)
  .replace(/\{\{lien_desabonnement\}\}/g, `${SITE_URL}/mon-compte/mes-notifications`)
  .replace(/\{\{lien_navigateur\}\}/g, `${SITE_URL}/nl/${newsletter.id}`)

const sujet = `[TEST] ${newsletter.sujet ?? 'Newsletter avril 2026'}`
  .replace(/\{\{nom\}\}/g, nomDisplay)

sgMail.setApiKey(SENDGRID_API_KEY)
await sgMail.send({
  to: TO,
  from: 'contact@100000medecins.org',
  subject: sujet,
  html,
})

console.log(`✅ Email de test envoyé à ${TO}`)
console.log(`🔗 Version web : ${SITE_URL}/nl/${newsletter.id}`)
