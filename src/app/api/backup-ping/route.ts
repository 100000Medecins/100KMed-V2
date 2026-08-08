import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Réception des « pings » du script de sauvegarde de la base.
 *
 * Le script `scripts/backup-supabase.ps1` (planifié sur le poste desktop) appelle
 * cette route après CHAQUE dump réussi. Le cron `/api/cron/verif-backup` surveille
 * ensuite l'ancienneté du dernier ping et alerte par email s'il vieillit.
 *
 * Principe du dead man's switch : c'est l'absence de signal qui déclenche l'alerte.
 * Une supervision qui tournerait sur la machine de sauvegarde ne pourrait pas
 * prévenir quand c'est cette machine qui tombe — d'où le report de la vigilance ici.
 *
 * Aucune donnée de la base ne transite : uniquement des métadonnées (nom du fichier,
 * taille, machine, horodatage).
 */

export const dynamic = 'force-dynamic'

/**
 * `backup_pings` est absente de `src/types/database.ts` jusqu'à la prochaine
 * régénération des types. On décrit précisément la surface utilisée plutôt que de
 * passer par un `as any` : le payload reste vérifié par le compilateur.
 * À supprimer au profit des types générés une fois la migration jouée.
 */
type BackupPingInsert = {
  fichier: string
  taille_octets: number
  machine: string | null
  effectue_le: string
}
type ClientAvecBackupPings = {
  from(table: 'backup_pings'): {
    insert(valeurs: BackupPingInsert): Promise<{ error: { message: string } | null }>
  }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.BACKUP_PING_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    fichier?: string
    taille_octets?: number | string
    machine?: string
    effectue_le?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const fichier = body.fichier?.trim()
  const taille = Number(body.taille_octets)
  if (!fichier || !Number.isFinite(taille) || taille <= 0) {
    return NextResponse.json(
      { error: 'Champs requis : fichier (texte), taille_octets (nombre > 0)' },
      { status: 400 }
    )
  }

  const effectueLe = body.effectue_le ? new Date(body.effectue_le) : new Date()
  if (Number.isNaN(effectueLe.getTime())) {
    return NextResponse.json({ error: 'effectue_le : date invalide' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { error } = await (supabase as unknown as ClientAvecBackupPings)
    .from('backup_pings')
    .insert({
      fichier,
      taille_octets: Math.round(taille),
      machine: body.machine?.trim() || null,
      effectue_le: effectueLe.toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, fichier, effectue_le: effectueLe.toISOString() })
}
