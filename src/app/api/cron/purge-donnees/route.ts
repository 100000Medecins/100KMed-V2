import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Purge hebdomadaire des données à durée de conservation limitée, telles qu'annoncées
 * dans la Charte de confidentialité (/rgpd, rédigée le 2026-09-30, durées validées par David) :
 *  - journaux techniques (psc_session_events, activity_log) : 12 mois ;
 *  - journal des affichages de portables de l'annuaire (annuaire_affichages_portables) : 12 mois ;
 *  - trace des comptes supprimés (compte_suppressions : nom, prénom, spécialité, motif) : 3 ans.
 * Si ces durées changent, mettre à jour la charte en même temps.
 *
 * Non gaté par `crons_routiniers_actifs` : ce drapeau coupe les emails aux utilisateurs,
 * ce cron n'en envoie aucun.
 */

export const dynamic = 'force-dynamic'

const PURGES = [
  { table: 'psc_session_events', colonne: 'created_at', mois: 12 },
  { table: 'activity_log', colonne: 'created_at', mois: 12 },
  { table: 'annuaire_affichages_portables', colonne: 'affiche_le', mois: 12 },
  { table: 'compte_suppressions', colonne: 'deleted_at', mois: 36 },
] as const

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()
  const resultats: Record<string, number | string> = {}

  for (const { table, colonne, mois } of PURGES) {
    const limite = new Date()
    limite.setMonth(limite.getMonth() - mois)
    const { count, error } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .lt(colonne, limite.toISOString())
    resultats[table] = error ? `erreur : ${error.message}` : (count ?? 0)
  }

  const enErreur = Object.values(resultats).some((v) => typeof v === 'string')
  return NextResponse.json({ resultats }, { status: enErreur ? 500 : 200 })
}
