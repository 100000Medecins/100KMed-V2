'use client'

import { useState, useTransition, useRef } from 'react'
import type { Database } from '@/types/database'
import RichTextEditor from './RichTextEditor'

type Categorie = Database['public']['Tables']['categories']['Row']

interface CategorieFormProps {
  categorie?: Categorie | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

export default function CategorieForm({ categorie, action }: CategorieFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [intro, setIntro] = useState(categorie?.intro ?? '')
  const [imageUrl, setImageUrl] = useState(categorie?.image_url ?? '')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setImageUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { setImageUploadError(json.error ?? 'Erreur upload'); return }
      setImageUrl(json.url)
    } catch {
      setImageUploadError('Erreur réseau')
    } finally {
      setImageUploading(false)
      if (imageFileInputRef.current) imageFileInputRef.current.value = ''
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set('intro', intro)
    formData.set('image_url', imageUrl)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
      )}

      <div>
        <label htmlFor="nom" className={labelClass}>Nom *</label>
        <input
          id="nom"
          type="text"
          name="nom"
          defaultValue={categorie?.nom ?? ''}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>Slug (URL)</label>
        <input
          id="slug"
          type="text"
          name="slug"
          defaultValue={categorie?.slug ?? ''}
          placeholder="Généré automatiquement si vide"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Introduction</label>
        <RichTextEditor
          initialContent={intro}
          onChange={setIntro}
          minHeight={150}
        />
      </div>

      {/* Image */}
      <div>
        <label className={labelClass}>Image (affichée à droite du texte)</label>
        <input
          ref={imageFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <div className="flex items-center gap-3">
          {imageUrl && (
            <img src={imageUrl} alt="Aperçu" className="h-20 w-32 object-cover rounded-xl border border-gray-200" />
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => imageFileInputRef.current?.click()}
              disabled={imageUploading}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              {imageUploading ? 'Upload...' : imageUrl ? 'Changer l\'image' : 'Uploader une image'}
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
              >
                Supprimer l'image
              </button>
            )}
          </div>
        </div>
        {imageUploadError && <p className="text-xs text-red-600 mt-1">{imageUploadError}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="icon" className={labelClass}>Icône (emoji)</label>
          <input
            id="icon"
            type="text"
            name="icon"
            defaultValue={categorie?.icon ?? ''}
            placeholder="💊"
            className={inputClass}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="actif"
              defaultChecked={categorie?.actif ?? true}
              className="w-5 h-5 rounded border-gray-300 text-accent-blue focus:ring-accent-blue/30"
            />
            <span className="text-sm font-medium text-navy">Active</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : categorie ? 'Mettre à jour' : 'Créer la catégorie'}
        </button>
        <a
          href="/admin/categories"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
