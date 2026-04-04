'use client'

import { useState, useTransition, useRef } from 'react'
import type { Database } from '@/types/database'
import type { SyndicatFoundateur } from '@/types/models'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { ChevronDown, GripVertical } from 'lucide-react'

type PageStatique = Database['public']['Tables']['pages_statiques']['Row'] & {
  metadata?: SyndicatFoundateur[] | null
}

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
  const [contenu, setContenu] = useState(page.contenu ?? '')
  const [syndicats, setSyndicats] = useState<SyndicatFoundateur[]>(
    Array.isArray(page.metadata) ? page.metadata : []
  )
  const [openSyndicat, setOpenSyndicat] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const isQuiSommesNous = page.slug === 'qui-sommes-nous'

  function handleDragStart(index: number) {
    dragIndexRef.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const updated = [...syndicats]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setSyndicats(updated)
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  function updateSyndicat(id: string, field: keyof SyndicatFoundateur, value: string) {
    setSyndicats((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set('contenu', contenu)
    if (isQuiSommesNous) {
      formData.set('metadata', JSON.stringify(syndicats))
    }
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

      {/* Contenu WYSIWYG */}
      <div>
        <label className={labelClass}>Contenu</label>
        <RichTextEditor
          initialContent={contenu}
          onChange={setContenu}
        />
      </div>

      {/* Syndicats fondateurs — uniquement pour "qui-sommes-nous" */}
      {isQuiSommesNous && syndicats.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className={labelClass}>Membres fondateurs</label>
          <p className="text-xs text-gray-400 -mt-1">
            Cliquez sur un syndicat pour modifier sa citation, son président et son titre.
          </p>

          {syndicats.map((s, index) => {
            const isOpen = openSyndicat === s.id
            const isDragOver = dragOverIndex === index
            return (
              <div
                key={s.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`border rounded-xl overflow-hidden transition-all ${isDragOver ? 'border-accent-blue ring-2 ring-accent-blue/20' : 'border-gray-200'}`}
              >
                {/* En-tête accordéon */}
                <div className="flex items-center bg-surface-light hover:bg-gray-100 transition-colors">
                  {/* Poignée de déplacement */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={() => setDragOverIndex(null)}
                    className="px-3 py-3.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
                    title="Glisser pour réordonner"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                <button
                  type="button"
                  onClick={() => setOpenSyndicat(isOpen ? null : s.id)}
                  className="flex-1 flex items-center justify-between gap-3 pr-5 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={s.logo_url}
                      alt={s.nom}
                      className="h-8 max-w-[80px] object-contain"
                    />
                    <div>
                      <p className="text-sm font-semibold text-navy">{s.nom}</p>
                      {s.nom_complet && (
                        <p className="text-xs text-gray-400">{s.nom_complet}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                </div>

                {/* Corps accordéon */}
                {isOpen && (
                  <div className="px-5 py-4 space-y-4 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Citation</label>
                      <textarea
                        value={s.citation}
                        onChange={(e) => updateSyndicat(s.id, 'citation', e.target.value)}
                        rows={4}
                        className={textareaClass}
                        placeholder="Texte de la citation..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Président(s)</label>
                        <input
                          type="text"
                          value={s.presidents}
                          onChange={(e) => updateSyndicat(s.id, 'presidents', e.target.value)}
                          className={inputClass}
                          placeholder="Dr Prénom NOM"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Titre officiel</label>
                        <input
                          type="text"
                          value={s.titre}
                          onChange={(e) => updateSyndicat(s.id, 'titre', e.target.value)}
                          className={inputClass}
                          placeholder="Président / Présidente"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">URL du logo</label>
                      <input
                        type="text"
                        value={s.logo_url}
                        onChange={(e) => updateSyndicat(s.id, 'logo_url', e.target.value)}
                        className={inputClass}
                        placeholder="/images/syndicats/nom.png"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
          href="/admin/pages"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
