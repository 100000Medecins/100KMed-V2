/**
 * Annuaire — proposer une compétence absente du catalogue, depuis l'application (tranche 3).
 * POST `{ "libelle": "…" }`, `Authorization: Bearer <jeton du site>`.
 * Renvoie l'intitulé existant s'il y en a déjà un (libellé ou synonyme), sinon la proposition
 * créée et cochée sur la fiche (validation par l'association).
 * Contrat : docs/2026-10-10-annuaire-tranche-3.md
 */

import { NextResponse } from 'next/server'
import { authentifierApp, refus, reponse } from '@/lib/annuaire/app-session'
import { proposerCompetence } from '@/lib/annuaire/fiche-serveur'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth

  const corps = (await request.json().catch(() => null)) as { libelle?: unknown } | null
  if (typeof corps?.libelle !== 'string') return refus(400, 'corps_invalide', 'Corps attendu : { "libelle": "…" }.')

  const res = await proposerCompetence(auth.rpps, corps.libelle)
  if ('error' in res) return refus(422, 'proposition_refusee', res.error)
  if ('existant' in res) return reponse({ existant: res.existant })
  return reponse({ proposee: res.intitule }, 201)
}
