'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toggleVideoStatut, reorderVideosAndRubriques, createVideoRubrique, deleteVideoRubrique } from '@/lib/actions/admin'
import DeleteVideoButton from '@/components/admin/DeleteVideoButton'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

// ─── Types internes ───────────────────────────────────────────────────────────

type RubriqueItem = { kind: 'rubrique'; id: string; nom: string; ordre: number }
type VideoItem = { kind: 'video' } & VideoRow
type Item = RubriqueItem | VideoItem

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

/** Construit la liste plate : rubrique → ses vidéos → rubrique → … → vidéos sans rubrique */
function buildItems(videos: VideoRow[], rubriques: VideoRubrique[]): Item[] {
  const sorted = [...rubriques].sort((a, b) => a.ordre - b.ordre)
  const result: Item[] = []
  for (const r of sorted) {
    result.push({ kind: 'rubrique', id: r.id, nom: r.nom, ordre: r.ordre })
    const vids = videos.filter(v => v.rubrique_id === r.id).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    for (const v of vids) result.push({ kind: 'video', ...v })
  }
  const noRubrique = videos.filter(v => !v.rubrique_id).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  for (const v of noRubrique) result.push({ kind: 'video', ...v })
  return result
}

/** Après un réordonnancement, recalcule rubrique_id de chaque vidéo et ordre de chaque item */
function computeAssignments(items: Item[]) {
  const videoUpdates: { id: string; ordre: number; rubrique_id: string | null }[] = []
  const rubriqueUpdates: { id: string; ordre: number }[] = []
  let currentRubriqueId: string | null = null
  let videoOrdre = 0
  let rubriqueOrdre = 0
  for (const item of items) {
    if (item.kind === 'rubrique') {
      rubriqueUpdates.push({ id: item.id, ordre: rubriqueOrdre++ })
      currentRubriqueId = item.id
    } else {
      videoUpdates.push({ id: item.id, ordre: videoOrdre++, rubrique_id: currentRubriqueId })
    }
  }
  return { videoUpdates, rubriqueUpdates }
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

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

// ─── Composant principal ──────────────────────────────────────────────────────

export default function VideosAdminList({ initialVideos, rubriques }: { initialVideos: VideoRow[]; rubriques: VideoRubrique[] }) {
  const [items, setItems] = useState(() => buildItems(initialVideos, rubriques))
  const [newRubrique, setNewRubrique] = useState('')
  const [isPending, startTransition] = useTransition()

  // Drag state
  const dragId = useRef<string | null>(null)
  const dragKind = useRef<'video' | 'rubrique' | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function handleDragStart(id: string, kind: 'video' | 'rubrique') {
    dragId.current = id
    dragKind.current = kind
  }

  function handleDragEnter(id: string, targetKind: 'video' | 'rubrique') {
    if (!dragId.current) return
    // Une rubrique ne peut être déposée que sur une autre rubrique
    if (dragKind.current === 'rubrique' && targetKind !== 'rubrique') return
    setDragOverId(id)
  }

  function handleDrop(dropId: string) {
    const fromId = dragId.current
    const kind = dragKind.current
    setDragOverId(null)
    dragId.current = null
    dragKind.current = null

    if (!fromId || !kind || fromId === dropId) return

    let next = [...items]
    const fromIdx = next.findIndex(i => i.id === fromId)
    if (fromIdx === -1) return

    if (kind === 'rubrique') {
      // Trouver la fin de la section (jusqu'à la prochaine rubrique ou fin)
      let sectionEnd = next.length
      for (let i = fromIdx + 1; i < next.length; i++) {
        if (next[i].kind === 'rubrique') { sectionEnd = i; break }
      }
      const section = next.splice(fromIdx, sectionEnd - fromIdx)
      const dropIdx = next.findIndex(i => i.id === dropId)
      if (dropIdx === -1) {
        next = [...next, ...section]
      } else {
        next.splice(dropIdx, 0, ...section)
      }
    } else {
      // Vidéo : déplacer un seul item
      const [moved] = next.splice(fromIdx, 1)
      const dropIdx = next.findIndex(i => i.id === dropId)
      if (dropIdx === -1) {
        next.push(moved)
      } else if (next[dropIdx].kind === 'rubrique') {
        // Déposer juste après la rubrique = premier élément de cette section
        next.splice(dropIdx + 1, 0, moved)
      } else {
        next.splice(dropIdx, 0, moved)
      }
    }

    setItems(next)
    const { videoUpdates, rubriqueUpdates } = computeAssignments(next)
    startTransition(() => reorderVideosAndRubriques(videoUpdates, rubriqueUpdates))
  }

  function handleAddRubrique() {
    if (!newRubrique.trim()) return
    const nom = newRubrique.trim()
    setNewRubrique('')
    // Ajout optimiste
    const tempId = 'tmp-' + Date.now()
    setItems(prev => [...prev, { kind: 'rubrique', id: tempId, nom, ordre: prev.filter(i => i.kind === 'rubrique').length }])
    startTransition(() => createVideoRubrique(nom))
  }

  function handleDeleteRubrique(id: string) {
    // Retirer la rubrique et détacher ses vidéos (elles passent sans rubrique)
    setItems(prev =>
      prev
        .filter(i => !(i.kind === 'rubrique' && i.id === id))
        .map(i => (i.kind === 'video' && i.rubrique_id === id) ? { ...i, rubrique_id: null } : i)
    )
    startTransition(() => deleteVideoRubrique(id))
  }

  return (
    <div className="space-y-6">
      {/* Liste plate : rubriques + vidéos */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            Aucune vidéo.{' '}
            <Link href="/admin/videos/nouveau" className="text-accent-blue hover:underline">Ajouter la première</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => {
              const isOver = dragOverId === item.id

              if (item.kind === 'rubrique') {
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id, 'rubrique')}
                    onDragEnter={() => handleDragEnter(item.id, 'rubrique')}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(item.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 border-l-4 border-accent-blue bg-blue-50/50 cursor-grab active:cursor-grabbing select-none transition-all ${isOver ? 'ring-2 ring-inset ring-accent-blue bg-blue-100/60' : ''}`}
                  >
                    <GripVertical className="w-4 h-4 text-accent-blue/40 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-navy">{item.nom}</span>
                    <button
                      onClick={() => handleDeleteRubrique(item.id)}
                      disabled={isPending}
                      title="Supprimer la rubrique"
                      className="text-gray-300 hover:text-red-400 transition-colors p-0.5 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id, 'video')}
                  onDragEnter={() => handleDragEnter(item.id, 'video')}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors cursor-grab active:cursor-grabbing group ${isOver ? 'ring-2 ring-inset ring-accent-blue/30 bg-blue-50/30' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <YouTubeThumbnail url={item.url} titre={item.titre} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy text-sm truncate">
                      {item.titre ?? <span className="text-gray-300 italic">Sans titre</span>}
                    </div>
                    {item.is_videos_principales && (
                      <span className="text-xs text-gray-400">· Page d'accueil</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ToggleStatut id={item.id} statut={item.statut} />
                    <Link
                      href={`/admin/videos/${item.id}/modifier`}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Éditer
                    </Link>
                    <DeleteVideoButton id={item.id} titre={item.titre} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ajouter une rubrique */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ajouter une rubrique-séparateur</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRubrique}
            onChange={e => setNewRubrique(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRubrique()}
            placeholder="ex. « Téléconsultation », « Agenda »…"
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
  )
}
