'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toggleVideoStatut, reorderVideos, createVideoRubrique, deleteVideoRubrique } from '@/lib/actions/admin'
import DeleteVideoButton from '@/components/admin/DeleteVideoButton'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

function YouTubeThumbnail({ url, titre }: { url: string | null; titre: string | null }) {
  const id = url ? getYouTubeId(url) : null
  if (!id) return <div className="w-16 h-10 rounded bg-gray-100 shrink-0" />
  return (
    <img
      src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
      alt={titre ?? ''}
      className="w-16 h-10 rounded object-cover shrink-0 bg-gray-100"
    />
  )
}

function ToggleStatut({ id, statut }: { id: string; statut: string | null }) {
  const [isPending, startTransition] = useTransition()
  const published = statut === 'publie'
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => toggleVideoStatut(id, published ? 'brouillon' : 'publie'))}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${published ? 'bg-green-400' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${published ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

export default function VideosAdminList({ initialVideos, rubriques }: { initialVideos: VideoRow[]; rubriques: VideoRubrique[] }) {
  const [videos, setVideos] = useState(initialVideos)
  const [rubriquesList, setRubriquesList] = useState(rubriques)
  const [newRubrique, setNewRubrique] = useState('')
  const [isPending, startTransition] = useTransition()
  const dragId = useRef<string | null>(null)
  const dragOver = useRef<string | null>(null)

  function handleDragStart(id: string) { dragId.current = id }
  function handleDragEnter(id: string) { dragOver.current = id }

  function handleDrop() {
    const from = dragId.current
    const to = dragOver.current
    if (!from || !to || from === to) return

    const next = [...videos]
    const fromIdx = next.findIndex((v) => v.id === from)
    const toIdx = next.findIndex((v) => v.id === to)
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setVideos(next)
    startTransition(() => reorderVideos(next.map((v) => v.id)))
    dragId.current = null
    dragOver.current = null
  }

  function handleAddRubrique() {
    if (!newRubrique.trim()) return
    startTransition(async () => {
      await createVideoRubrique(newRubrique.trim())
      setRubriquesList((prev) => [...prev, { id: 'tmp-' + Date.now(), nom: newRubrique.trim(), ordre: prev.length }])
      setNewRubrique('')
    })
  }

  function handleDeleteRubrique(id: string) {
    startTransition(async () => {
      await deleteVideoRubrique(id)
      setRubriquesList((prev) => prev.filter((r) => r.id !== id))
    })
  }

  return (
    <div className="space-y-8">
      {/* Liste vidéos */}
      <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
        {videos.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            Aucune vidéo.{' '}
            <Link href="/admin/videos/nouveau" className="text-accent-blue hover:underline">Ajouter la première</Link>
          </div>
        ) : videos.map((video) => {
          const rubrique = rubriquesList.find((r) => r.id === video.rubrique_id)
          return (
            <div
              key={video.id}
              draggable
              onDragStart={() => handleDragStart(video.id)}
              onDragEnter={() => handleDragEnter(video.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors cursor-grab active:cursor-grabbing group"
            >
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <YouTubeThumbnail url={video.url} titre={video.titre} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy text-sm truncate">{video.titre ?? <span className="text-gray-300">Sans titre</span>}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {rubrique && (
                    <span className="text-xs text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">{rubrique.nom}</span>
                  )}
                  {video.is_videos_principales && (
                    <span className="text-xs text-gray-400">· Accueil</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ToggleStatut id={video.id} statut={video.statut} />
                <Link
                  href={`/admin/videos/${video.id}/modifier`}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Éditer
                </Link>
                <DeleteVideoButton id={video.id} titre={video.titre} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Gestion rubriques */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-4">Rubriques</h2>
        <div className="bg-white rounded-card shadow-card p-4 space-y-2">
          {rubriquesList.length === 0 && (
            <p className="text-sm text-gray-400">Aucune rubrique.</p>
          )}
          {rubriquesList.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-light">
              <span className="text-sm text-navy">{r.nom}</span>
              <button
                onClick={() => handleDeleteRubrique(r.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              value={newRubrique}
              onChange={(e) => setNewRubrique(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRubrique()}
              placeholder="Nouvelle rubrique…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
            <button
              onClick={handleAddRubrique}
              disabled={isPending || !newRubrique.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
