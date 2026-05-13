// Génère le vrai lien "Gérer mes préférences de notification" pour un user,
// reproduisant exactement ce qui est mis en footer des mails de campagne.
//
// Usage :
//   node scripts/preview-unsub-link.mjs <userId|email>
//   node scripts/preview-unsub-link.mjs <userId|email> --local
//   node scripts/preview-unsub-link.mjs <userId|email> --target=https://...
//
// Par défaut : cible la valeur de NEXT_PUBLIC_SITE_URL dans .env.local.
// --local         : force http://localhost:3000 (utile avec `npm run dev`).
// --target=<url>  : force une cible précise.

import { createHmac } from 'crypto'
import { readFileSync } from 'fs'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const args = process.argv.slice(2)
const isLocal = args.includes('--local')
const targetOverride = args.find(a => a.startsWith('--target='))?.slice('--target='.length)
const user = args.filter(a => !a.startsWith('--'))[0]

if (!user) {
  console.error('Usage:')
  console.error('  node scripts/preview-unsub-link.mjs <userId|email>')
  console.error('  node scripts/preview-unsub-link.mjs <userId|email> --local')
  console.error('  node scripts/preview-unsub-link.mjs <userId|email> --target=https://...')
  process.exit(1)
}

const secret = env.EMAIL_SECRET || env.ADMIN_PASSWORD
if (!secret) {
  console.error('EMAIL_SECRET ou ADMIN_PASSWORD absent de .env.local')
  process.exit(1)
}

const siteUrl = isLocal
  ? 'http://localhost:3000'
  : (targetOverride || env.NEXT_PUBLIC_SITE_URL || 'https://www.100000medecins.org').replace(/\/$/, '')

async function resolveUserId(arg) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg)) {
    return arg
  }
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data } = await supabase.from('users').select('id').eq('email', arg).maybeSingle()
  if (data?.id) return data.id

  const { data: data2 } = await supabase.from('users').select('id').eq('contact_email', arg).maybeSingle()
  if (data2?.id) return data2.id

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const found = authList?.users?.find(u => u.email === arg)
  if (found?.id) return found.id

  throw new Error(`Aucun utilisateur trouvé pour ${arg}`)
}

const userId = await resolveUserId(user)
const iat = Math.floor(Date.now() / 1000)
const token = createHmac('sha256', secret).update(`notif:${userId}:${iat}`).digest('hex')
const url = `${siteUrl}/gerer-notifications?uid=${userId}&iat=${iat}&token=${token}`

console.log('')
console.log(`Lien pour user ${userId} (cible ${siteUrl}) :`)
console.log('')
console.log(url)
console.log('')
