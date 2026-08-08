import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'
import { EMAIL_SENDER } from '@/lib/email/sender'

/**
 * Surveillance des sauvegardes de la base (dead man's switch).
 *
 * Le script `scripts/backup-supabase.ps1` pingue `/api/backup-ping` après chaque
 * dump réussi. Ce cron quotidien vérifie l'ancienneté du dernier ping : au-delà de
 * SEUIL_JOURS, il envoie une alerte. Silencieux quand tout va bien.
 *
 * Contexte : les sauvegardes tournent tous les 3-4 jours sur un poste Windows, et la
 * base Supabase est en plan Free — donc AUCUN backup côté serveur. Ce dump local est
 * le seul filet. En juin-juillet 2026, la réplication vers le second poste s'est
 * arrêtée cinq semaines sans que rien ne le signale : d'où cette route.
 */

export const dynamic = 'force-dynamic'

const ALERTE_TO = 'david.azerad@100000medecins.org'
const SEUIL_JOURS = 8 // ~2 exécutions manquées (cadence normale : 3-4 jours)

/**
 * `backup_pings` est absente de `src/types/database.ts` jusqu'à la prochaine
 * régénération des types. On décrit précisément la surface utilisée plutôt que de
 * passer par un `as any`. À supprimer au profit des types générés.
 */
type BackupPingRow = {
  fichier: string
  taille_octets: number
  machine: string | null
  effectue_le: string
}
type ClientAvecBackupPings = {
  from(table: 'backup_pings'): {
    select(colonnes: string): {
      order(
        colonne: string,
        options: { ascending: boolean }
      ): {
        limit(n: number): Promise<{
          data: BackupPingRow[] | null
          error: { message: string } | null
        }>
      }
    }
  }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function envoyerAlerte(sujet: string, corpsHtml: string): Promise<string | null> {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  try {
    await sgMail.send({
      to: ALERTE_TO,
      from: EMAIL_SENDER,
      subject: sujet,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;max-width:640px;margin:0 auto;">
          <h2 style="color:#b45309;">Alerte sauvegarde base de données</h2>
          ${corpsHtml}
          <p style="color:#555;font-size:13px;margin-top:24px;">
            Rappel : la base est en plan Supabase <strong>Free</strong>, sans sauvegarde côté
            serveur. Le dump local est le seul filet.
          </p>
          <p style="color:#888;font-size:12px;">
            Vérifications : la tâche « Backup Supabase 100KMed » sur le poste desktop
            (Planificateur de tâches), puis le journal
            <code>Documents\\100 000 Médecins\\Site\\Dump BDD\\backup.log</code>.
          </p>
        </div>
      `,
    })
    return null
  } catch (e) {
    return String(e)
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ skipped: true, env: process.env.VERCEL_ENV })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await (supabase as unknown as ClientAvecBackupPings)
    .from('backup_pings')
    .select('fichier, taille_octets, machine, effectue_le')
    .order('effectue_le', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dernier: BackupPingRow | undefined = (data ?? [])[0]

  // Aucun ping : soit le script n'est pas encore branché, soit il ne pingue plus.
  // Dans les deux cas ce n'est pas un état normal → on alerte.
  if (!dernier) {
    const err = await envoyerAlerte(
      '[Backup] Aucun ping de sauvegarde enregistré',
      `<p>La table <code>backup_pings</code> est vide : aucune sauvegarde ne s'est signalée.</p>
       <p>Si le script vient d'être déployé, c'est attendu jusqu'à sa première exécution
       (tous les 3-4 jours à 3h00). Au-delà, le script ne pingue pas — vérifier
       <code>BACKUP_PING_SECRET</code> côté poste et côté Vercel.</p>`
    )
    return NextResponse.json({ ok: true, alerte: 'aucun_ping', emailErreur: err })
  }

  const ageMs = Date.now() - new Date(dernier.effectue_le).getTime()
  const ageJours = Math.floor(ageMs / 86_400_000)

  if (ageJours < SEUIL_JOURS) {
    return NextResponse.json({
      ok: true,
      alerte: null,
      ageJours,
      dernier: dernier.fichier,
    })
  }

  const quand = new Date(dernier.effectue_le).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const mo = (dernier.taille_octets / 1_048_576).toFixed(2)

  const err = await envoyerAlerte(
    `[Backup] Aucune sauvegarde depuis ${ageJours} jours`,
    `<p>La dernière sauvegarde signalée date de <strong>${ageJours} jours</strong>
     (seuil d'alerte : ${SEUIL_JOURS} jours).</p>
     <ul>
       <li>Fichier : <code>${esc(dernier.fichier)}</code></li>
       <li>Taille : ${mo} Mo</li>
       <li>Machine : ${dernier.machine ? esc(dernier.machine) : 'non précisée'}</li>
       <li>Horodatage : ${quand}</li>
     </ul>`
  )

  return NextResponse.json({
    ok: true,
    alerte: 'backup_ancien',
    ageJours,
    dernier: dernier.fichier,
    emailErreur: err,
  })
}
