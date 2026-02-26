'use client'

import { useState, useTransition } from 'react'
import type { Database } from '@/types/database'

type PageStatique = Database['public']['Tables']['pages_statiques']['Row']

interface BlogFormProps {
  page: PageStatique
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass =
  'w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

export default function BlogForm({ page, action }: BlogFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
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

      {/* Slug (lecture seule) */}
      <div>
        <label className={labelClass}>Slug (URL)</label>
        <div className="px-5 py-3 bg-gray-50 border border-gray-200 rounded-button text-sm text-gray-500 font-mono">
          /{page.slug}
        </div>
      </div>

      {/* Titre */}
      <div>
        <label htmlFor="titre" className={labelClass}>Titre *</label>
        <input
          id="titre"
          type="text"
          name="titre"
          defaultValue={page.titre}
          required
          className={inputClass}
        />
      </div>

      {/* Image de couverture */}
      <div>
        <label htmlFor="image_couverture" className={labelClass}>Image de couverture (URL)</label>
        <input
          id="image_couverture"
          type="text"
          name="image_couverture"
          defaultValue={page.image_couverture ?? ''}
          placeholder="https://... ou /images/..."
          className={inputClass}
        />
      </div>

      {/* Meta description */}
      <div>
        <label htmlFor="meta_description" className={labelClass}>Meta description (SEO)</label>
        <textarea
          id="meta_description"
          name="meta_description"
          defaultValue={page.meta_description ?? ''}
          rows={2}
          className={textareaClass}
        />
      </div>

      {/* Contenu HTML */}
      <div>
        <label htmlFor="contenu" className={labelClass}>Contenu (HTML)</label>
        <textarea
          id="contenu"
          name="contenu"
          defaultValue={page.contenu ?? ''}
          rows={20}
          className={`${textareaClass} font-mono text-xs`}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Le contenu est rendu en HTML avec le style prose-custom. Utilisez les balises &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;blockquote&gt; etc.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : 'Mettre à jour'}
        </button>
        <a
          href="/admin/blog"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
