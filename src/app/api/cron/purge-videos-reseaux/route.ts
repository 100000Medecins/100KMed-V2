import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { purgerFichiers } from '@/lib/reseaux/fichiers'

export const dynamic = 'force-dynamic'

/**
 * Efface chaque jour les fichiers vidéo des posts réseaux qui ne servent plus (bucket privé
 * `videos-reseaux`) : 7 jours après leur publication, 30 jours s'ils n'ont jamais été publiés,
 * et les dépôts abandonnés. La lecture sur le site reste YouTube : rien de public n'est touché.
 *
 * Non gaté par `crons_routiniers_actifs` : ce drapeau coupe les emails aux utilisateurs,
 * ce cron n'en envoie aucun.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  return NextResponse.json({ ok: true, ...(await purgerFichiers(createServiceRoleClient())) })
}
