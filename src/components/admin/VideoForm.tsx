'use client'

import { useMemo, useState, useTransition } from 'react'
import { X, Search } from 'lucide-react'
import type { VideoRow, VideoRubrique } from '@/lib/db/misc'

export interface SolutionOption {
  id: string
  nom: string
  categorie_nom: string | null
}

interface VideoFormProps {
  video?: VideoRow | null
  rubriques?: VideoRubrique[]
  solutions?: SolutionOption[]
  initialSolutionIds?: string[]
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

export default function VideoForm({
  video,
  rubriques = [],
  solutions = [],
  initialSolutionIds = [],
  action,
}: VideoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedSolutionIds, setSelectedSolutionIds] = useState<string[]>(initialSolutionIds)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('solution_ids', JSON.stringify(selectedSolutionIds))
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
            <label className={labelClass}>Rubrique</label>
            <select name="rubrique_id" defaultValue={video?.rubrique_id ?? ''} className={inputClass}>
              <option value="">— Aucune —</option>
              {rubriques.map((r) => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
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
              <option value="en_attente">En attente de modération</option>
              <option value="refuse">Refusé</option>
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

        <div>
          <label className={labelClass}>Solutions liées à cette vidéo</label>
          <p className="text-xs text-gray-500 mb-2">
            La vidéo apparaîtra dans la galerie de chaque solution sélectionnée (en plus de la rubrique Stories &amp; Tutos, qui reste indépendante).
          </p>
          <SolutionsLieesSelector
            solutions={solutions}
            selected={selectedSolutionIds}
            onChange={setSelectedSolutionIds}
          />
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

function SolutionsLieesSelector({
  solutions,
  selected,
  onChange,
}: {
  solutions: SolutionOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const selectedSolutions = useMemo(
    () => solutions.filter((s) => selectedSet.has(s.id)),
    [solutions, selectedSet],
  )

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return solutions
      .filter((s) => !selectedSet.has(s.id))
      .filter((s) =>
        s.nom.toLowerCase().includes(q) || (s.categorie_nom ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [solutions, selectedSet, query])

  function add(id: string) {
    onChange([...selected, id])
    setQuery('')
  }

  function remove(id: string) {
    onChange(selected.filter((x) => x !== id))
  }

  return (
    <div className="rounded-button border border-gray-200 bg-white p-3">
      {selectedSolutions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedSolutions.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
            >
              {s.nom}
              {s.categorie_nom && <span className="text-accent-blue/60">· {s.categorie_nom}</span>}
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="hover:bg-accent-blue/20 rounded-full p-0.5"
                aria-label={`Retirer ${s.nom}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selectedSolutions.length === 0 ? 'Rechercher une solution à lier…' : 'Ajouter une autre solution…'}
          className="w-full rounded-button bg-gray-50 border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none pl-8 pr-3 py-2"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-60 overflow-y-auto rounded-button border border-gray-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => add(s.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
              >
                <span className="text-gray-700">{s.nom}</span>
                {s.categorie_nom && (
                  <span className="text-xs text-gray-400 shrink-0">{s.categorie_nom}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
