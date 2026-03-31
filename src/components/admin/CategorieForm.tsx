'use client'

import { useState, useTransition } from 'react'
import type { Database } from '@/types/database'
import RichTextEditor from './RichTextEditor'

type Categorie = Database['public']['Tables']['categories']['Row']

interface CategorieFormProps {
  categorie?: Categorie | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass =
  'w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

export default function CategorieForm({ categorie, action }: CategorieFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [intro, setIntro] = useState(categorie?.intro ?? '')

  function handleSubmit(formData: FormData) {
    formData.set('intro', intro)
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
          {isPending
            ? 'Enregistrement...'
            : categorie
              ? 'Mettre à jour'
              : 'Créer la catégorie'}
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
