'use client'

import { useState, useTransition } from 'react'
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
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Upload, Loader2 } from 'lucide-react'
import {
  adminAddAvatar,
  adminDeleteAvatar,
  adminReorderAvatars,
  adminPurgeAvatarOrphans,
} from '@/lib/actions/admin-avatars'

interface Avatar {
  id: string
  url: string
  display_order: number | null
}

interface Props {
  initialCatalog: Avatar[]
  personalCount: number
}

function SortableAvatar({ avatar, onDelete }: { avatar: Avatar; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: avatar.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="aspect-square rounded-full overflow-hidden bg-surface-light border-2 border-transparent hover:border-accent-blue cursor-grab active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar.url} alt="" className="w-full h-full object-cover pointer-events-none" />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        title="Supprimer cet avatar"
        aria-label="Supprimer cet avatar"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function AdminAvatarsManager({
  initialCatalog,
  personalCount: initialPersonalCount,
}: Props) {
  const [catalog, setCatalog] = useState(initialCatalog)
  const [personalCount] = useState(initialPersonalCount)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = catalog.findIndex((a) => a.id === active.id)
    const newIndex = catalog.findIndex((a) => a.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previous = catalog
    const newOrder = arrayMove(catalog, oldIndex, newIndex)
    setCatalog(newOrder) // optimistic

    startTransition(async () => {
      try {
        await adminReorderAvatars(newOrder.map((a) => a.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de réordonnancement')
        setCatalog(previous) // rollback
      }
    })
  }

  const handleDelete = (avatarId: string) => {
    if (
      !confirm(
        'Supprimer définitivement cet avatar du catalogue ? Les utilisateurs qui l\'avaient choisi retomberont sur le fallback initiale (la FK fait le travail automatiquement).',
      )
    )
      return

    startTransition(async () => {
      try {
        setError(null)
        await adminDeleteAvatar(avatarId)
        setCatalog((prev) => prev.filter((a) => a.id !== avatarId))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de suppression')
      }
    })
  }

  const handleUpload = () => {
    if (!uploadFile) return
    startTransition(async () => {
      try {
        setError(null)
        const formData = new FormData()
        formData.append('photo', uploadFile)
        const result = await adminAddAvatar(formData)
        setCatalog((prev) => [
          ...prev,
          { id: result.avatarId, url: result.url, display_order: result.displayOrder },
        ])
        setUploadFile(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur d\'upload')
      }
    })
  }

  const handlePurge = () => {
    if (
      !confirm(
        'Lancer le garbage collector ? Les fichiers PNG du Storage qui ne sont plus référencés en BDD seront supprimés (irréversible).',
      )
    )
      return

    setPurgeResult(null)
    startTransition(async () => {
      try {
        setError(null)
        const result = await adminPurgeAvatarOrphans()
        setPurgeResult(
          `Scannés : ${result.scanned} fichiers Storage · Référencés en BDD : ${result.referenced} · Orphelins supprimés : ${result.deleted}`,
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la purge')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">
            Catalogue d&apos;avatars ({catalog.length})
          </h2>
          {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <p className="text-xs text-gray-500">
          Glissez-déposez pour réordonner. L&apos;ordre détermine l&apos;affichage dans la grille de
          sélection (page profil + bannière).
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={catalog.map((a) => a.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
              {catalog.map((avatar) => (
                <SortableAvatar
                  key={avatar.id}
                  avatar={avatar}
                  onDelete={() => handleDelete(avatar.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-navy">Ajouter un avatar au catalogue</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-card hover:border-accent-blue text-sm">
                <Upload className="w-4 h-4" />
                {uploadFile
                  ? uploadFile.name
                  : 'Choisir un fichier (PNG 256×256 recommandé, max 5 Mo)'}
              </span>
            </label>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || isPending}
              className="px-4 py-2 bg-accent-blue text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Upload…' : 'Ajouter'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-card shadow-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-navy">Avatars personnels utilisateurs</h2>
        <p className="text-sm text-gray-600">
          <strong>{personalCount}</strong> avatar
          {personalCount > 1 ? 's' : ''} perso actuellement en BDD (générés par les utilisateurs via
          leur photo). Stockés dans <code className="text-xs bg-gray-100 px-1 rounded">avatars/personal/&lt;user_id&gt;/*.png</code>.
        </p>
        <p className="text-xs text-gray-500">
          Le cleanup automatique supprime les essais non choisis à chaque génération / sélection /
          suppression d&apos;avatar côté utilisateur. La purge ci-dessous est un filet de sécurité
          en cas de fichiers Storage qui auraient échappé au cleanup (rare).
        </p>
        <button
          type="button"
          onClick={handlePurge}
          disabled={isPending}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Purger les orphelins Storage
        </button>
        {purgeResult && <p className="text-xs text-green-700 mt-2">{purgeResult}</p>}
      </div>
    </div>
  )
}
