export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import VideosAdminList from '@/components/admin/VideosAdminList'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

async function getVideosAdmin(): Promise<VideoRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('videos')
    .select('*, rubrique:video_rubriques(*)')
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

export default async function AdminVideosPage() {
  const [videos, rubriques] = await Promise.all([getVideosAdmin(), getRubriquesAdmin()])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Vidéos & Stories</h1>
          <p className="text-sm text-gray-500 mt-1">{videos.length} vidéo{videos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/videos/nouveau"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-button hover:bg-navy-dark transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Nouvelle vidéo
        </Link>
      </div>
      <VideosAdminList initialVideos={videos} rubriques={rubriques} />
    </div>
  )
}
