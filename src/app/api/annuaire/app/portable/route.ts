/**
 * Annuaire — afficher le portable d'un confrère depuis l'application (tranche 3).
 * Même fonction de la base que le site : un seul plafond (10 confrères / 24 h) et un seul journal.
 * POST `{ "rpps": "…" }`, `Authorization: Bearer <jeton du site>`.
 * Contrat : docs/2026-10-10-annuaire-tranche-3.md
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { authentifierApp, refus, reponse } from '@/lib/annuaire/app-session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth

  const corps = (await request.json().catch(() => null)) as { rpps?: unknown } | null
  const rpps = typeof corps?.rpps === 'string' ? corps.rpps : ''
  if (!/^[0-9]{11}$/.test(rpps)) return refus(400, 'rpps_invalide', 'RPPS attendu : 11 chiffres.')

  const { data, error } = await createServiceRoleClient().rpc('annuaire_portable_pour', {
    p_lecteur_rpps: auth.rpps,
    p_rpps: rpps,
  })
  if (error) {
    if (error.hint === 'plafond') {
      return refus(429, 'plafond', 'Limite atteinte : 10 numéros de portable par 24 heures.')
    }
    if (error.code === '42501') return refus(403, 'lecteur_non_admis', "L'annuaire est réservé aux médecins.")
    console.error('[annuaire app] portable :', error.message)
    return refus(500, 'erreur_serveur', 'Le numéro n’a pas pu être affiché. Réessayer.')
  }
  if (!data) return refus(404, 'portable_indisponible', 'Ce confrère ne rend pas son portable visible.')
  return reponse({ portable: data })
}
