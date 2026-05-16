export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import VideosAdminList from '@/components/admin/VideosAdminList'
import VideosPendingPanel from '@/components/admin/VideosPendingPanel'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

async function getVideosAdmin(): Promise<VideoRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('videos')
    .select('*, rubrique:video_rubriques(*)')
    .neq('statut', 'en_attente')
    .order('ordre', { ascending: true })
  return data ?? []
}

async function getRubriquesAdmin(): Promise<VideoRubrique[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_rubriques')
    .select('*')
    .order('ordre', { ascending: true })
  return data ?? []
}

async function getPendingVideos() {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('videos')
    .select('id, titre, url, description, type, vignette, created_at, created_by')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Array<{
    id: string; titre: string | null; url: string | null; description: string | null
    type: string | null; vignette: string | null; created_at: string | null; created_by: string | null
  }>

  // Charger en bloc les profils des proposeurs
  const userIds = Array.from(new Set(rows.map((r) => r.created_by).filter((x): x is string => !!x)))
  const proposerMap = new Map<string, { prenom: string | null; nom: string | null; pseudo: string | null; email: string | null }>()
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (supabase as any)
      .from('users')
      .select('id, prenom, nom, pseudo, email, contact_email')
      .in('id', userIds)
    for (const u of users ?? []) {
      proposerMap.set(u.id, {
        prenom: u.prenom,
        nom: u.nom,
        pseudo: u.pseudo,
        email: u.contact_email ?? u.email,
      })
    }
  }

  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    url: r.url,
    description: r.description,
    type: r.type,
    vignette: r.vignette,
    created_at: r.created_at,
    proposer: r.created_by ? proposerMap.get(r.created_by) ?? null : null,
  }))
}

export default async function AdminVideosPage() {
  const [videos, rubriques, pending] = await Promise.all([
    getVideosAdmin(),
    getRubriquesAdmin(),
    getPendingVideos(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Vidéos & Stories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {videos.length} vidéo{videos.length !== 1 ? 's' : ''} publiée{videos.length !== 1 ? 's' : ''}
            {pending.length > 0 && <> · <span className="text-amber-600 font-medium">{pending.length} proposition{pending.length > 1 ? 's' : ''} en attente</span></>}
          </p>
        </div>
        <Link
          href="/admin/videos/nouveau"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-button hover:bg-navy-dark transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Nouvelle vidéo
        </Link>
      </div>
      <VideosPendingPanel videos={pending} />
      <VideosAdminList initialVideos={videos} rubriques={rubriques} />
    </div>
  )
}
