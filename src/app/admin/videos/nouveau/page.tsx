export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import VideoForm from '@/components/admin/VideoForm'
import { createVideo } from '@/lib/actions/admin'
import type { VideoRubrique } from '@/lib/db/misc'

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

export default async function NouvelleVideoPage() {
  const [rubriques, solutions] = await Promise.all([getRubriques(), getSolutionsForSelector()])
  return (
    <div>
      <Link href="/admin/videos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux vidéos
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvelle vidéo</h1>
      <VideoForm rubriques={rubriques} solutions={solutions} action={createVideo} />
    </div>
  )
}
