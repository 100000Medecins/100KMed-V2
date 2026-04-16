export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import VideoForm from '@/components/admin/VideoForm'
import { updateVideo } from '@/lib/actions/admin'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

async function getVideoById(id: string): Promise<VideoRow | null> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('videos').select('*').eq('id', id).single()
  return data ?? null
}

async function getRubriques(): Promise<VideoRubrique[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('video_rubriques').select('*').order('ordre', { ascending: true })
  return data ?? []
}

export default async function ModifierVideoPage({ params }: { params: { id: string } }) {
  const [video, rubriques] = await Promise.all([getVideoById(params.id), getRubriques()])
  if (!video) notFound()

  const action = updateVideo.bind(null, video.id)

  return (
    <div>
      <Link href="/admin/videos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux vidéos
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">{video.titre ?? 'Modifier la vidéo'}</h1>
      <VideoForm video={video} rubriques={rubriques} action={action} />
    </div>
  )
}
