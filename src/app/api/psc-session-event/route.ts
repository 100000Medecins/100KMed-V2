import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/psc-session-event
 *
 * Point de collecte (mesure additive) de l'issue du handoff de session PSC.
 * Appelé par la page client /auth/psc-session après le verifyOtp.
 * Écriture réservée au service_role (table interne `psc_session_events`).
 *
 * Volontairement permissif et silencieux : ce log ne doit JAMAIS perturber
 * le parcours d'auth. Toute erreur est avalée et renvoie 204.
 */
const ALLOWED_STEPS = new Set(['verify_success', 'verify_error', 'verify_timeout'])

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const correlationId = typeof body?.correlation_id === 'string' ? body.correlation_id : null
    const step = typeof body?.step === 'string' ? body.step : null
    const detail = typeof body?.detail === 'string' ? body.detail.slice(0, 500) : null

    if (correlationId && step && ALLOWED_STEPS.has(step)) {
      const supabase = createServiceRoleClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('psc_session_events')
        .insert({ correlation_id: correlationId, step, detail })
    }
  } catch {
    // jamais bloquant
  }
  return new NextResponse(null, { status: 204 })
}
