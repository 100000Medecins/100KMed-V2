/**
 * Diagnostic LECTURE SEULE — parcours des inscrits PSC à email synthétique.
 *
 * Objectif : comprendre pourquoi tant de comptes `psc-…@psc.sante.fr` n'ont
 * jamais renseigné d'email réel (`contact_email`). Question clé : ont-ils
 * seulement atteint la page `/completer-profil` après l'auth PSC ?
 *
 * Discriminant : `auth.users.last_sign_in_at`.
 *   - NULL  → la session n'a JAMAIS été établie (le verifyOtp client à
 *             /auth/psc-session a échoué) → l'utilisateur n'a jamais vu la page.
 *   - non NULL → session établie → il a été redirigé vers /completer-profil ;
 *             s'il est is_complete=false, il a abandonné AVANT de saisir l'email.
 *
 * Aucune écriture. Lance : npx tsx scripts/diag-psc-parcours.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Bascule onboarding allégé (mdp optionnel) ~ 2026-06-20
const REWORK_DATE = '2026-06-20'

type Row = {
  id: string
  created_at: string
  is_complete: boolean | null
  contact_email: string | null
  specialite: string | null
}

async function main() {
  // 1. Tous les comptes PSC à email synthétique
  const psc: Row[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('users')
      .select('id, created_at, is_complete, contact_email, specialite')
      .like('email', 'psc-%@psc.sante.fr')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    psc.push(...(data as Row[]))
    if (data.length < PAGE) break
    from += PAGE
  }

  // 2. last_sign_in_at depuis auth.users
  const lastSignIn = new Map<string, string | null>()
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    if (!data?.users || data.users.length === 0) break
    for (const u of data.users) lastSignIn.set(u.id, u.last_sign_in_at ?? null)
    if (data.users.length < 1000) break
    page++
  }

  // 3. user_ids ayant ≥ 1 évaluation
  const evalUserIds = new Set<string>()
  {
    let efrom = 0
    while (true) {
      const { data, error } = await supabase
        .from('evaluations')
        .select('user_id')
        .not('user_id', 'is', null)
        .range(efrom, efrom + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      for (const e of data as { user_id: string }[]) evalUserIds.add(e.user_id)
      if (data.length < PAGE) break
      efrom += PAGE
    }
  }

  // 4. Buckets
  const buckets = (rows: Row[]) => {
    let jamaisSession = 0
    let sessionEtAbandon = 0 // session établie mais is_complete=false
    let complet = 0
    let avecEval = 0
    let jamaisSessionAvecEmail = 0
    for (const r of rows) {
      const lsi = lastSignIn.get(r.id) ?? null
      if (evalUserIds.has(r.id)) avecEval++
      if (r.is_complete) { complet++; continue }
      if (lsi === null) {
        jamaisSession++
        if (r.contact_email) jamaisSessionAvecEmail++
      } else {
        sessionEtAbandon++
      }
    }
    return { total: rows.length, jamaisSession, sessionEtAbandon, complet, avecEval, jamaisSessionAvecEmail }
  }

  const all = buckets(psc)
  const apres = buckets(psc.filter(r => r.created_at >= REWORK_DATE))
  const avant = buckets(psc.filter(r => r.created_at < REWORK_DATE))

  // Caractérisation de la cohorte "jamais de session" : répartition dans le temps
  // (systématique vs incident) + lien évaluation.
  const jamais = psc.filter(r => !r.is_complete && (lastSignIn.get(r.id) ?? null) === null)
  const parJour = new Map<string, { n: number; avecEval: number }>()
  for (const r of jamais) {
    const jour = r.created_at.slice(0, 10)
    const cur = parJour.get(jour) ?? { n: 0, avecEval: 0 }
    cur.n++
    if (evalUserIds.has(r.id)) cur.avecEval++
    parJour.set(jour, cur)
  }
  console.log('\n=== Cohorte "JAMAIS de session" — répartition par jour de création ===')
  console.log('(systématique si réparti, incident si concentré ; avecEval = venait évaluer)')
  for (const [jour, v] of Array.from(parJour.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`  ${jour} : ${v.n} comptes  (dont ${v.avecEval} avec évaluation)`)
  }
  const jamaisAvecEval = jamais.filter(r => evalUserIds.has(r.id)).length
  console.log(`\n  Total "jamais de session" : ${jamais.length}  — dont ${jamaisAvecEval} ont une évaluation publiée malgré tout`)

  const pct = (n: number, d: number) => d ? `${Math.round((n / d) * 100)}%` : '—'
  const show = (label: string, b: ReturnType<typeof buckets>) => {
    console.log(`\n=== ${label} (${b.total} comptes PSC synthétiques) ===`)
    console.log(`  Profil complété (email saisi)      : ${b.complet}  (${pct(b.complet, b.total)})`)
    console.log(`  Session établie mais abandon page  : ${b.sessionEtAbandon}  (${pct(b.sessionEtAbandon, b.total)})`)
    console.log(`  JAMAIS de session (n'a jamais vu la page) : ${b.jamaisSession}  (${pct(b.jamaisSession, b.total)})`)
    console.log(`    dont avec un contact_email malgré tout : ${b.jamaisSessionAvecEmail}`)
    console.log(`  Ont posté ≥1 évaluation             : ${b.avecEval}`)
  }

  console.log('Date de bascule onboarding allégé utilisée :', REWORK_DATE)
  show('GLOBAL', all)
  show(`APRÈS rework (>= ${REWORK_DATE})`, apres)
  show(`AVANT rework (< ${REWORK_DATE})`, avant)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
