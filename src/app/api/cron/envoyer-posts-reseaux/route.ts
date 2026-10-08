import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { transmettre } from '@/lib/reseaux/envoi'

export const dynamic = 'force-dynamic'

/**
 * Transmet à Make les posts réseaux programmés dont l'heure est passée.
 * Appelée toutes les 5 minutes par pg_cron (Supabase), seulement s'il y a un post dû :
 * les crons Vercel du plan Hobby ne tournent qu'une fois par jour.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()
  const maintenant = new Date().toISOString()

  // Envoi interrompu (fonction coupée entre la prise en charge et le retour de Make).
  const quinzeMinutes = new Date(Date.now() - 15 * 60_000).toISOString()
  await supabase
    .from('posts_reseaux')
    .update({ statut: 'erreur', erreur: 'Envoi interrompu : vérifier dans l’historique Make avant de renvoyer', updated_at: maintenant })
    .eq('statut', 'en_cours')
    .lt('updated_at', quinzeMinutes)

  // Prise en charge atomique : un appel concurrent ne reprend pas les mêmes posts.
  const { data: dus, error } = await supabase
    .from('posts_reseaux')
    .update({ statut: 'en_cours', updated_at: maintenant })
    .eq('statut', 'programme')
    .lte('programme_le', maintenant)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const post of dus ?? []) await transmettre(supabase, post)

  return NextResponse.json({ ok: true, transmis: dus?.length ?? 0 })
}
