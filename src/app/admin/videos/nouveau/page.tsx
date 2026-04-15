export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import VideoForm from '@/components/admin/VideoForm'
import { createVideo } from '@/lib/actions/admin'

export default function NouvelleVideoPage() {
  return (
    <div>
      <Link href="/admin/videos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux vidéos
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvelle vidéo</h1>
      <VideoForm action={createVideo} />
    </div>
  )
}
