'use client'

import { useTransition } from 'react'
import type { VideoRow } from '@/lib/db/misc'

interface VideoFormProps {
  video?: VideoRow | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export default function VideoForm({ video, action }: VideoFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => { await action(formData) })
  }

  const previewId = video?.url ? getYouTubeId(video.url) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-card shadow-card p-6 space-y-5">

        <div>
          <label className={labelClass}>Titre</label>
          <input type="text" name="titre" defaultValue={video?.titre ?? ''} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>URL YouTube / Vimeo <span className="text-red-400">*</span></label>
          <input type="url" name="url" required defaultValue={video?.url ?? ''} className={inputClass}
            placeholder="https://www.youtube.com/watch?v=..." />
          {previewId && (
            <div className="mt-3 rounded-xl overflow-hidden aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${previewId}`}
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>URL vignette (optionnel)</label>
          <input type="url" name="vignette" defaultValue={video?.vignette ?? ''} className={inputClass}
            placeholder="https://..." />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" defaultValue={video?.description ?? ''} rows={3} className={textareaClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Thème</label>
            <input type="text" name="theme" defaultValue={video?.theme ?? ''} className={inputClass}
              placeholder="ex: Agenda médical, IA..." />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select name="type" defaultValue={video?.type ?? 'youtube'} className={inputClass}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ordre d'affichage</label>
            <input type="number" name="ordre" defaultValue={video?.ordre ?? ''} className={inputClass} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select name="statut" defaultValue={video?.statut ?? 'publie'} className={inputClass}>
              <option value="publie">Publié</option>
              <option value="brouillon">Brouillon</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_videos_principales"
            name="is_videos_principales"
            value="true"
            defaultChecked={video?.is_videos_principales ?? false}
            className="w-4 h-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue"
          />
          <label htmlFor="is_videos_principales" className="text-sm font-medium text-gray-700">
            Afficher sur la page d'accueil
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
      >
        {isPending ? 'Enregistrement…' : video ? 'Mettre à jour' : 'Créer la vidéo'}
      </button>
    </form>
  )
}
