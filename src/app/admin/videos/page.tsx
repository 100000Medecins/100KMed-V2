export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteVideoButton from '@/components/admin/DeleteVideoButton'
import type { VideoRow } from '@/lib/db/misc'

async function getVideosAdmin(): Promise<VideoRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('videos')
    .select('*')
    .order('ordre', { ascending: true })
  return data ?? []
}

export default async function AdminVideosPage() {
  const videos = await getVideosAdmin()

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

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {videos.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            Aucune vidéo.{' '}
            <Link href="/admin/videos/nouveau" className="text-accent-blue hover:underline">
              Ajouter la première
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Thème</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Statut</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Accueil</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ordre</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-surface-light transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-navy">{video.titre ?? <span className="text-gray-300">Sans titre</span>}</span>
                      {video.url && (
                        <span className="block text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[220px]">{video.url}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                      {video.theme ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        video.statut === 'publie' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {video.statut === 'publie' ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {video.is_videos_principales ? (
                        <span className="text-xs text-accent-blue font-medium">Oui</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">{video.ordre ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/videos/${video.id}/modifier`}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Éditer
                        </Link>
                        <DeleteVideoButton id={video.id} titre={video.titre} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
