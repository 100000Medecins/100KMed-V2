'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const NOTIF_TO = 'contact@100000medecins.org'
const NOTIF_FROM = 'contact@100000medecins.org'

const CIT_STATUTS = ['en_attente', 'publiee', 'refusee'] as const
type CitStatut = (typeof CIT_STATUTS)[number]

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
}
async function assertAdmin() {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_token')?.value !== generateToken()) throw new Error('Non autorisé')
}

function revalidateCitations() {
  revalidatePath('/admin/citations')
  // Le carrousel est lu sur /solutions/[idCategorie] (scope layout pour couvrir toutes les catégories)
  revalidatePath('/solutions', 'layout')
}

/**
 * Public (médecin connecté) : proposer une citation → statut 'en_attente'.
 * Même flux que les autres propositions (journal admin + email best-effort).
 */
export async function proposerCitation(
  input: { text: string; auteur?: string | null },
): Promise<{ status: 'SUCCESS' } | { status: 'ERROR'; message: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'ERROR', message: 'Vous devez être connecté.' }

  const text = input.text.trim()
  const auteur = input.auteur?.trim() || null
  if (!text) return { status: 'ERROR', message: 'Le texte de la citation est requis.' }

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('citations').insert({
    text,
    auteur,
    statut: 'en_attente',
    propose_par: user.id,
  })
  if (error) return { status: 'ERROR', message: error.message }

  // Journal de supervision admin
  const { data: prof } = await admin
    .from('users')
    .select('prenom, nom, pseudo, email, contact_email')
    .eq('id', user.id)
    .single()
  await logActivity({
    type: ACTIVITY_TYPES.PROPOSITION,
    acteurType: 'medecin',
    acteurId: user.id,
    acteurLabel: prof?.pseudo || [prof?.prenom, prof?.nom].filter(Boolean).join(' ') || null,
    cibleType: 'citation',
    cibleLabel: text.slice(0, 80),
    diff: { type: { avant: null, apres: 'citation' } },
    gravite: 'a_moderer',
  })

  // Notification admin (best-effort)
  try {
    if (process.env.SENDGRID_API_KEY) {
      const label = prof?.pseudo
        || `${prof?.prenom ?? ''} ${prof?.nom ?? ''}`.trim()
        || prof?.contact_email || prof?.email || 'Utilisateur'
      const email = prof?.contact_email || prof?.email || ''
      await sgMail.send({
        to: NOTIF_TO,
        from: { email: NOTIF_FROM, name: '100000médecins.org' },
        subject: `[Proposition Citation] ${text.slice(0, 60)}`,
        html: `
          <h2>Nouvelle citation proposée</h2>
          <p><strong>Proposée par :</strong> ${label}${email ? ` (${email})` : ''}</p>
          <p><strong>Citation :</strong> « ${text} »</p>
          ${auteur ? `<p><strong>Attribuée à :</strong> ${auteur}</p>` : ''}
          <hr />
          <p style="font-size:12px;color:#666">À modérer dans <a href="https://www.100000medecins.org/admin/citations">l'admin</a>.</p>
        `,
      })
    }
  } catch (e) {
    console.error('[proposerCitation] email notif failed:', e)
  }

  revalidatePath('/admin/citations')
  return { status: 'SUCCESS' }
}

/** Admin : créer une citation directement publiée. */
export async function createCitation(input: { text: string; auteur?: string | null }) {
  await assertAdmin()
  const text = input.text.trim()
  if (!text) return { error: 'Le texte est requis.' }
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('citations').insert({
    text,
    auteur: input.auteur?.trim() || null,
    statut: 'publiee',
  })
  if (error) return { error: error.message }
  revalidateCitations()
  return { ok: true }
}

/** Admin : éditer le texte / l'auteur. */
export async function updateCitation(id: string, input: { text: string; auteur?: string | null }) {
  await assertAdmin()
  const text = input.text.trim()
  if (!text) return { error: 'Le texte est requis.' }
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('citations').update({
    text,
    auteur: input.auteur?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidateCitations()
  return { ok: true }
}

/** Admin : changer le statut (publier / refuser / remettre en attente). */
export async function setStatutCitation(id: string, statut: CitStatut) {
  await assertAdmin()
  if (!CIT_STATUTS.includes(statut)) return { error: 'Statut invalide.' }
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('citations').update({
    statut,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidateCitations()
  return { ok: true }
}

/** Admin : supprimer. */
export async function deleteCitation(id: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('citations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateCitations()
  return { ok: true }
}
