'use client'

import { useMemo, useState, useTransition } from 'react'
import { X, Search, ExternalLink, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  linkVideoToSolution,
  unlinkVideoFromSolution,
  reorderVideosForSolution,
} from '@/lib/actions/admin'

type LinkedVideo = {
  id: string
  titre: string | null
  statut: string
  url: string | null
}

type SelectableVideo = {
  id: string
  titre: string | null
  statut: string
}

interface Props {
  solutionId: string
  initialLinked: LinkedVideo[]
  allVideos: SelectableVideo[]
}

interface ChipProps {
  video: LinkedVideo
  isBusy: boolean
  onRemove: (id: string) => void
}

function VideoChip({ video, isBusy, onRemove }: ChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isBusy ? 0.5 : 1,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        video.statut === 'publie'
          ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none hover:bg-black/5 rounded-full p-0.5 -ml-1 shrink-0"
        aria-label="Glisser pour réordonner"
        title="Glisser pour réordonner"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <span className="max-w-xs truncate">{video.titre ?? 'Sans titre'}</span>
      {video.statut !== 'publie' && (
        <span className="text-[10px] uppercase tracking-wider">· {video.statut}</span>
      )}
      {video.url && (
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline shrink-0"
          title="Ouvrir sur YouTube"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      <button
        type="button"
        onClick={() => onRemove(video.id)}
        disabled={isBusy}
        className="hover:bg-black/5 rounded-full p-0.5 shrink-0"
        aria-label={`Détacher ${video.titre ?? ''}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

export default function VideosLieesManager({ solutionId, initialLinked, allVideos }: Props) {
  const [linked, setLinked] = useState<LinkedVideo[]>(initialLinked)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const linkedSet = useMemo(() => new Set(linked.map((v) => v.id)), [linked])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allVideos
      .filter((v) => !linkedSet.has(v.id))
      .filter((v) => (v.titre ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [allVideos, linkedSet, query])

  function addVideo(v: SelectableVideo) {
    setError(null)
    setBusyId(v.id)
    startTransition(async () => {
      const res = await linkVideoToSolution(v.id, solutionId)
      if (res?.error) {
        setError(res.error)
      } else {
        setLinked((prev) => [
          ...prev,
          { id: v.id, titre: v.titre, statut: v.statut, url: null },
        ])
        setQuery('')
      }
      setBusyId(null)
    })
  }

  function removeVideo(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await unlinkVideoFromSolution(id, solutionId)
      if (res?.error) {
        setError(res.error)
      } else {
        setLinked((prev) => prev.filter((v) => v.id !== id))
      }
      setBusyId(null)
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = linked.findIndex((v) => v.id === active.id)
    const newIndex = linked.findIndex((v) => v.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(linked, oldIndex, newIndex)
    const previous = linked
    setLinked(reordered) // optimiste

    startTransition(async () => {
      const res = await reorderVideosForSolution(
        solutionId,
        reordered.map((v) => v.id),
      )
      if (res?.error) {
        setError(res.error)
        setLinked(previous) // rollback
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Les vidéos liées et publiées apparaissent automatiquement dans la galerie de cette solution côté front.
        Les vidéos en attente sont conservées mais invisibles tant qu'elles ne sont pas publiées dans <code>/admin/videos</code>.
        Glisse la poignée <GripVertical className="inline w-3 h-3 -mt-0.5" /> pour réordonner.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg">{error}</div>
      )}

      {linked.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={linked.map((v) => v.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-1.5">
              {linked.map((v) => (
                <VideoChip
                  key={v.id}
                  video={v}
                  isBusy={busyId === v.id}
                  onRemove={removeVideo}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={linked.length === 0
            ? 'Rechercher une vidéo existante à rattacher…'
            : 'Ajouter une autre vidéo existante…'}
          className="w-full rounded-button bg-gray-50 border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none pl-8 pr-3 py-2"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-60 overflow-y-auto rounded-button border border-gray-200 bg-white shadow-lg">
            {suggestions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addVideo(v)}
                disabled={busyId === v.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <span className="text-gray-700 truncate">{v.titre ?? 'Sans titre'}</span>
                {v.statut !== 'publie' && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-600 shrink-0">en attente</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Astuce : pour ajouter une vidéo qui n'existe pas encore, va dans{' '}
        <a href="/admin/videos/nouveau" className="text-accent-blue hover:underline">/admin/videos/nouveau</a>{' '}
        et coche cette solution dans le champ "Solutions liées" du formulaire.
      </p>
    </div>
  )
}
