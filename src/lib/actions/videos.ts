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

export async function approveVideoProposal(id: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('videos')
    .update({ statut: 'publie' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  revalidatePath('/stories-tutos')
  revalidatePath('/')
  return { ok: true }
}

export async function rejectVideoProposal(id: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('videos')
    .update({ statut: 'refuse' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/videos')
  return { ok: true }
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export async function submitVideoProposal(input: {
  titre: string
  url: string
  description: string
  type: 'youtube' | 'vimeo' | 'autre'
  proposerEmail?: string | null
}): Promise<{ status: 'SUCCESS' } | { status: 'ERROR'; message: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const titre = input.titre.trim()
  const url = input.url.trim()
  const description = input.description.trim()
  const anonymousEmail = input.proposerEmail?.trim() || null
  if (!titre) return { status: 'ERROR', message: 'Le titre est requis.' }
  if (!url) return { status: 'ERROR', message: "L'URL de la vidéo est requise." }
  try { new URL(url) } catch { return { status: 'ERROR', message: "L'URL n'est pas valide." } }

  // Vignette YouTube auto si possible
  let vignette: string | null = null
  if (input.type === 'youtube') {
    const id = extractYouTubeId(url)
    if (id) vignette = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  }

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('videos').insert({
    titre,
    url,
    description: description || null,
    type: input.type,
    statut: 'en_attente',
    vignette,
    created_by: user?.id ?? null,
  })
  if (error) return { status: 'ERROR', message: error.message }

  // Notification admin par email (best-effort, ne bloque pas la soumission)
  try {
    if (process.env.SENDGRID_API_KEY) {
      let proposerLabel = 'Visiteur anonyme'
      let proposerEmail = anonymousEmail
      if (user) {
        const { data: profile } = await admin
          .from('users')
          .select('prenom, nom, pseudo, email, contact_email')
          .eq('id', user.id)
          .single()
        proposerLabel = profile?.pseudo
          || `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim()
          || profile?.contact_email
          || profile?.email
          || 'Utilisateur'
        proposerEmail = profile?.contact_email || profile?.email || null
      }
      await sgMail.send({
        to: NOTIF_TO,
        from: { email: NOTIF_FROM, name: '100000médecins.org' },
        subject: `[Proposition Vidéo] ${titre}`,
        html: `
          <h2>Nouvelle proposition vidéo</h2>
          <p><strong>Auteur :</strong> ${proposerLabel}${proposerEmail ? ` (${proposerEmail})` : ''}</p>
          <p><strong>Titre :</strong> ${titre}</p>
          <p><strong>URL :</strong> <a href="${url}">${url}</a></p>
          ${description ? `<hr /><p><strong>Description :</strong></p><p>${description.replace(/\n/g, '<br />')}</p>` : ''}
          <hr />
          <p style="font-size:12px;color:#666">À modérer dans <a href="https://www.100000medecins.org/admin/videos">l'admin</a>.</p>
        `,
      })
    }
  } catch (e) {
    console.error('[submitVideoProposal] email notif failed:', e)
  }

  revalidatePath('/admin/videos')
  return { status: 'SUCCESS' }
}
