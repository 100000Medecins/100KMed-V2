import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidateSolutionById } from '@/lib/revalidate-solution'
import { jetonRevalidationValide } from '@/lib/email/revalidation'

export const dynamic = 'force-dynamic'

/**
 * Anciens liens des emails de relance (avant le 2026-10-10) : ils pointaient ici et
 * revalidaient l'avis au simple chargement. Un GET n'écrit plus rien, il mène à la page
 * de confirmation ; seul le bouton de cette page (POST ci-dessous) revalide.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  return NextResponse.redirect(`${origin}/confirmer-avis?${searchParams.toString()}`)
}

export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url)
  const form = await req.formData()
  const uid = String(form.get('uid') ?? '')
  const sid = String(form.get('sid') ?? '')
  const token = String(form.get('token') ?? '')

  const retour = (erreur: string) =>
    NextResponse.redirect(
      `${origin}/confirmer-avis?${new URLSearchParams({ uid, sid, token, erreur })}`,
      303,
    )

  if (!uid || !sid || !token || !jetonRevalidationValide(uid, sid, token)) return retour('lien-invalide')

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('evaluations')
    .update({
      last_date_note: new Date().toISOString(),
      last_relance_sent_at: null,
      relance_count: 0,
    })
    .eq('user_id', uid)
    .eq('solution_id', sid)
    .select('id')

  if (error || !data || data.length === 0) return retour('revalidation-echouee')

  // `last_date_note` est la clé du tri par défaut des témoignages sur la fiche
  // (cf. getAvisUtilisateursPaginated) : reconfirmer réordonne la liste publique.
  // Best-effort : une revalidation ratée ne doit pas casser la confirmation.
  try {
    await revalidateSolutionById(sid)
  } catch (e) {
    console.error('[revalider-avis] revalidation échouée (ignorée):', e)
  }

  return NextResponse.redirect(`${origin}/avis-confirme`, 303)
}
