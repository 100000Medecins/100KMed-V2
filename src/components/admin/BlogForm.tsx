'use client'

import { useState, useTransition, useRef } from 'react'
import type { Database } from '@/types/database'
import type { SyndicatFoundateur } from '@/types/models'
import type { UnsplashPhoto } from '@/app/api/suggerer-image/route'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { ChevronDown, GripVertical, ImageIcon, Sparkles } from 'lucide-react'

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

  // Image
  const [imageUrl, setImageUrl] = useState(page.image_couverture ?? '')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  // Suggestions images
  const [imageSuggestions, setImageSuggestions] = useState<UnsplashPhoto[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState(page.titre ?? '')
  const [suggestionProvider, setSuggestionProvider] = useState<'unsplash' | 'pexels'>('unsplash')
  const [usedKeywords, setUsedKeywords] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<UnsplashPhoto | null>(null)

  async function handleSuggestImages() {
    const query = suggestionQuery.trim() || page.titre?.trim()
    if (!query) return
    setIsLoadingSuggestions(true)
    setSuggestionsError(null)
    setShowSuggestions(true)
    setUsedKeywords(null)
    try {
      const res = await fetch('/api/suggerer-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: query, provider: suggestionProvider }),
      })
      const data = await res.json()
      if (!res.ok) { setSuggestionsError(data.error ?? 'Erreur'); return }
      setImageSuggestions(data.photos ?? [])
      setUsedKeywords(data.keywords ?? null)
    } catch { setSuggestionsError('Erreur réseau') }
    finally { setIsLoadingSuggestions(false) }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setImageError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setImageError(json.error ?? 'Erreur upload'); return }
      setImageUrl(json.url)
    } catch { setImageError('Erreur réseau') }
    finally { setImageUploading(false); if (imageRef.current) imageRef.current.value = '' }
  }

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
    formData.set('image_couverture', imageUrl)
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
      <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
        <label className={labelClass}>Image de couverture</label>
        <input type="hidden" name="image_couverture" value={imageUrl} />
        <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
        {imageUrl && (
          <img src={imageUrl} alt="Couverture" className="w-full h-40 object-cover rounded-xl border border-gray-100" />
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            disabled={imageUploading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-gray-400" />
            {imageUploading ? 'Upload...' : imageUrl ? 'Changer l\'image' : 'Uploader une image'}
          </button>
          <div className="space-y-1.5 w-full">
            <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg w-fit">
              {(['unsplash', 'pexels'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSuggestionProvider(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${suggestionProvider === p ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {p === 'unsplash' ? 'Unsplash' : 'Pexels'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={suggestionQuery}
                onChange={(e) => setSuggestionQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSuggestImages() } }}
                placeholder={page.titre || 'Mots-clés pour la recherche…'}
                className="flex-1 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSuggestImages}
                disabled={isLoadingSuggestions || (!suggestionQuery.trim() && !page.titre?.trim())}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-accent-blue/30 text-accent-blue rounded-xl hover:bg-accent-blue/5 disabled:opacity-50 transition-colors flex-shrink-0"
                title="Suggérer des images"
              >
                <Sparkles className="w-4 h-4" />
                {isLoadingSuggestions ? 'Recherche…' : 'Suggérer'}
              </button>
            </div>
          </div>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl('')} className="px-4 py-2 text-sm text-red-400 hover:text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
              Supprimer
            </button>
          )}
        </div>
        {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        {suggestionsError && <p className="text-xs text-red-600">{suggestionsError}</p>}

        {showSuggestions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Cliquez sur une photo pour la prévisualiser</p>
                {usedKeywords && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">Recherche : <span className="font-mono">{usedKeywords}</span></p>
                )}
              </div>
              <button type="button" onClick={() => setShowSuggestions(false)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">Fermer</button>
            </div>
            {isLoadingSuggestions && (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            )}
            {!isLoadingSuggestions && imageSuggestions.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {imageSuggestions.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setPreviewPhoto(photo)}
                    className="relative group h-16 overflow-hidden rounded-lg border-2 border-transparent hover:border-accent-blue transition-all"
                    title={`Prévisualiser — ${photo.photographer}`}
                  >
                    <img src={photo.thumb_url} alt={photo.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-medium bg-black/50 rounded px-1.5 py-0.5 transition-opacity">Voir</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400 text-center">
              {suggestionProvider === 'pexels'
                ? <>Photos via <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Pexels</a></>
                : <>Photos via <a href="https://unsplash.com?utm_source=100000medecins&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Unsplash</a></>
              }
            </p>
          </div>
        )}

        {/* Modal prévisualisation */}
        {previewPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={previewPhoto.small_url} alt={previewPhoto.alt} className="w-full object-contain max-h-[60vh]" />
              <div className="p-4 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-400">
                  Photo par <a href={previewPhoto.photographer_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{previewPhoto.photographer}</a> · {previewPhoto.source === 'pexels' ? 'Pexels' : 'Unsplash'}
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setPreviewPhoto(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
                  <button
                    type="button"
                    onClick={() => { setImageUrl(previewPhoto.regular_url); setShowSuggestions(false); setPreviewPhoto(null) }}
                    className="px-4 py-2 text-sm bg-navy text-white rounded-xl hover:bg-navy-dark transition-colors font-medium"
                  >
                    Sélectionner cette photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
