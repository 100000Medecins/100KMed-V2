export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import VideoForm from '@/components/admin/VideoForm'
import { updateVideo, getSolutionsLieesAVideo } from '@/lib/actions/admin'
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

async function getSolutionsForSelector() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('solutions')
    .select('id, nom, categorie:categories(nom)')
    .eq('actif', true)
    .order('nom')
  return (data ?? []).map((s) => ({
    id: s.id,
    nom: s.nom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categorie_nom: (s.categorie as any)?.nom ?? null,
  }))
}

export default async function ModifierVideoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [video, rubriques, solutions, initialSolutionIds] = await Promise.all([
    getVideoById(params.id),
    getRubriques(),
    getSolutionsForSelector(),
    getSolutionsLieesAVideo(params.id),
  ])
  if (!video) notFound()

  const action = updateVideo.bind(null, video.id)

  return (
    <div>
      <Link href="/admin/videos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux vidéos
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">{video.titre ?? 'Modifier la vidéo'}</h1>
      <VideoForm
        video={video}
        rubriques={rubriques}
        solutions={solutions}
        initialSolutionIds={initialSolutionIds}
        action={action}
      />
    </div>
  )
}
