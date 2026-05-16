'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
}): Promise<{ status: 'SUCCESS' } | { status: 'ERROR'; message: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'ERROR', message: 'Vous devez être connecté.' }

  const titre = input.titre.trim()
  const url = input.url.trim()
  const description = input.description.trim()
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
    created_by: user.id,
  })
  if (error) return { status: 'ERROR', message: error.message }

  revalidatePath('/admin/videos')
  return { status: 'SUCCESS' }
}
