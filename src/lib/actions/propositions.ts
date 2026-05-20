'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const NOTIF_TO = 'contact@100000medecins.org'
const NOTIF_FROM = 'contact@100000medecins.org'

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export async function submitProposition(input: {
  type: 'idee' | 'correction'
  titre: string
  description: string
  urlConcernee?: string | null
}): Promise<{ status: 'SUCCESS' } | { status: 'ERROR'; message: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'ERROR', message: 'Vous devez être connecté.' }

  const titre = input.titre.trim()
  const description = input.description.trim()
  const urlConcernee = input.urlConcernee?.trim() || null
  if (!titre) return { status: 'ERROR', message: 'Le titre est requis.' }
  if (!description) return { status: 'ERROR', message: 'La description est requise.' }
  if (input.type !== 'idee' && input.type !== 'correction') {
    return { status: 'ERROR', message: 'Type invalide.' }
  }

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('propositions_utilisateurs').insert({
    user_id: user.id,
    type: input.type,
    titre,
    description,
    url_concernee: urlConcernee,
  })
  if (error) return { status: 'ERROR', message: error.message }

  // Notification admin par email (best-effort, ne bloque pas la soumission)
  try {
    if (process.env.SENDGRID_API_KEY) {
      const { data: profile } = await admin
        .from('users')
        .select('prenom, nom, pseudo, email, contact_email')
        .eq('id', user.id)
        .single()
      const proposerLabel = profile?.pseudo
        || `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim()
        || profile?.contact_email
        || profile?.email
        || 'Utilisateur anonyme'
      const typeLabel = input.type === 'idee' ? 'Idée' : 'Correction'
      const proposerEmail = profile?.contact_email || profile?.email || ''
      await sgMail.send({
        to: NOTIF_TO,
        from: { email: NOTIF_FROM, name: '100000médecins.org' },
        subject: `[Proposition ${typeLabel}] ${titre}`,
        html: `
          <h2>Nouvelle proposition utilisateur — ${typeLabel}</h2>
          <p><strong>Auteur :</strong> ${proposerLabel}${proposerEmail ? ` (${proposerEmail})` : ''}</p>
          <p><strong>Titre :</strong> ${titre}</p>
          ${urlConcernee ? `<p><strong>URL concernée :</strong> <a href="${urlConcernee}">${urlConcernee}</a></p>` : ''}
          <hr />
          <p><strong>Description :</strong></p>
          <p>${description.replace(/\n/g, '<br />')}</p>
          <hr />
          <p style="font-size:12px;color:#666">À traiter dans <a href="https://www.100000medecins.org/admin/propositions">l'admin</a>.</p>
        `,
      })
    }
  } catch (e) {
    console.error('[submitProposition] email notif failed:', e)
  }

  revalidatePath('/admin/propositions')
  return { status: 'SUCCESS' }
}

export async function setPropositionStatut(id: string, statut: 'en_attente' | 'traite' | 'refuse', adminNotes?: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  const updates: Record<string, unknown> = { statut, updated_at: new Date().toISOString() }
  if (adminNotes !== undefined) updates.admin_notes = adminNotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('propositions_utilisateurs').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/propositions')
  return { ok: true }
}

export async function deleteProposition(id: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('propositions_utilisateurs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/propositions')
  return { ok: true }
}
