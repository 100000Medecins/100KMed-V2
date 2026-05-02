'use client'

import { useState, useTransition, useRef } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Images } from 'lucide-react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { updateArticleImageCouverture } from '@/lib/actions/admin'
import type { UnsplashPhoto } from '@/app/api/suggerer-image/route'

type Cat = { id: string; nom: string }

type Article = {
  id?: string
  titre?: string
  slug?: string
  extrait?: string | null
  contenu?: string | null
  image_couverture?: string | null
  meta_description?: string | null
  id_categorie?: string | null
  statut?: string
  scheduled_at?: string | null
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ArticleFormProps {
  article?: Article | null
  categories: Cat[]
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

const inputClass = 'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

export default function ArticleForm({ article, categories, action }: ArticleFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [statut, setStatut] = useState(article?.statut ?? 'brouillon')
  const [scheduledAt, setScheduledAt] = useState(() => toDatetimeLocal(article?.scheduled_at))

  // Champs contrôlés (pour pouvoir les peupler depuis la génération)
  const [titre, setTitre] = useState(article?.titre ?? '')
  const [extrait, setExtrait] = useState(article?.extrait ?? '')
  const [metaDescription, setMetaDescription] = useState(article?.meta_description ?? '')
  const [contenu, setContenu] = useState(article?.contenu ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!!article?.slug)
  const [editorKey, setEditorKey] = useState(0)

  // Image
  const [imageUrl, setImageUrl] = useState(article?.image_couverture ?? '')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  // Génération article
  const [showGenerer, setShowGenerer] = useState(!article?.id)
  const [brief, setBrief] = useState('')
  const [longueur, setLongueur] = useState<'breve' | 'article' | 'dossier'>('article')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Suggestions d'images
  const [imageSuggestions, setImageSuggestions] = useState<UnsplashPhoto[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState(titre)
  const [suggestionProvider, setSuggestionProvider] = useState<'unsplash' | 'pexels'>('unsplash')
  const [usedKeywords, setUsedKeywords] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<UnsplashPhoto | null>(null)

  async function handleSuggestImages(providerOverride?: 'unsplash' | 'pexels') {
    const query = suggestionQuery.trim() || titre.trim()
    if (!query) return
    const provider = providerOverride ?? suggestionProvider
    setIsLoadingSuggestions(true)
    setSuggestionsError(null)
    setShowSuggestions(true)
    setUsedKeywords(null)
    try {
      const res = await fetch('/api/suggerer-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: query, provider }),
      })
      const data = await res.json()
      if (!res.ok) { setSuggestionsError(data.error ?? 'Erreur'); return }
      setImageSuggestions(data.photos ?? [])
      setUsedKeywords(data.keywords ?? null)
    } catch {
      setSuggestionsError('Erreur réseau')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  async function handleSelectUnsplashPhoto(photo: UnsplashPhoto) {
    setImageUrl(photo.regular_url)
    setShowSuggestions(false)
    if (article?.id) await updateArticleImageCouverture(article.id, photo.regular_url)
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
      if (article?.id) await updateArticleImageCouverture(article.id, json.url)
    } catch { setImageError('Erreur réseau') }
    finally { setImageUploading(false); if (imageRef.current) imageRef.current.value = '' }
  }

  async function handleGenerate() {
    if (!brief.trim()) return
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/generer-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet: brief, longueur }),
      })
      const data = await res.json()
      if (!res.ok) { setGenerateError(data.error ?? 'Erreur lors de la génération'); return }

      setTitre(data.titre ?? '')
      if (!slugManual) setSlug(slugify(data.titre ?? ''))
      setExtrait(data.chapeau ?? '')
      setMetaDescription(data.meta_description ?? '')
      setContenu(data.contenu_html ?? '')
      setEditorKey((k) => k + 1) // force le rechargement du RichTextEditor
    } catch {
      setGenerateError('Erreur réseau')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set('titre', titre)
    formData.set('extrait', extrait)
    formData.set('meta_description', metaDescription)
    formData.set('contenu', contenu)
    formData.set('slug', slug)
    formData.set('image_couverture', imageUrl)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      {/* ── Panneau Générer avec Claude ── */}
      <div className="bg-gradient-to-r from-accent-blue/5 to-accent-pink/5 border border-accent-blue/20 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGenerer((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-blue" />
            <span className="text-sm font-semibold text-navy">Générer avec Claude</span>
            {article?.id && <span className="text-xs text-gray-400">(remplacera le contenu actuel)</span>}
          </div>
          {showGenerer ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showGenerer && (
          <div className="px-5 pb-5 space-y-3 border-t border-accent-blue/10">
            <p className="text-xs text-gray-500 mt-3">
              Décrivez le sujet, l'angle ou les points clés à aborder. Claude générera le titre, le chapeau, le contenu et la méta description.
            </p>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="Ex : L'impact de l'IA sur la consultation de médecine générale — focus sur les outils d'aide à la prescription et les risques de dépendance algorithmique..."
              className="w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-4 py-3 resize-y"
            />
            {generateError && (
              <p className="text-xs text-red-600">{generateError}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
                {([
                  { value: 'breve', label: 'Brève', hint: '~400 mots' },
                  { value: 'article', label: 'Article', hint: '~800 mots' },
                  { value: 'dossier', label: 'Dossier', hint: '~1500 mots' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLongueur(opt.value)}
                    className={`px-4 py-2 transition-colors ${longueur === opt.value ? 'bg-accent-blue text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    title={opt.hint}
                  >
                    {opt.label}
                    <span className="ml-1 opacity-60">{opt.hint}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !brief.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-accent-blue text-white rounded-xl hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Génération en cours…' : 'Générer l\'article'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="md:col-span-2 space-y-5">

          {/* Titre */}
          <div>
            <label htmlFor="titre" className={labelClass}>Titre *</label>
            <input
              id="titre" type="text" required
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value)
                if (!slugManual) setSlug(slugify(e.target.value))
              }}
              className={inputClass}
              placeholder="Titre de l'article"
            />
          </div>

          {/* Slug */}
          <div>
            <label className={labelClass}>Slug (URL)</label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-400 shrink-0">/blog/</span>
              <input
                type="text" value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                className={inputClass}
                placeholder="url-de-larticle"
              />
            </div>
          </div>

          {/* Extrait / Chapeau */}
          <div>
            <label htmlFor="extrait" className={labelClass}>Extrait / Chapeau</label>
            <textarea
              id="extrait" rows={3}
              value={extrait}
              onChange={(e) => setExtrait(e.target.value)}
              className="w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y"
              placeholder="Résumé court affiché sur la carte et en intro de l'article"
            />
          </div>

          {/* Contenu WYSIWYG */}
          <div>
            <label className={labelClass}>Contenu</label>
            <RichTextEditor key={editorKey} initialContent={contenu} onChange={setContenu} minHeight={320} />
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5">

          {/* Statut */}
          <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
            <label className={labelClass}>Publication</label>
            <select
              name="statut"
              value={statut}
              onChange={(e) => {
                setStatut(e.target.value)
                if (e.target.value === 'publié') setScheduledAt('')
              }}
              className={inputClass}
            >
              <option value="brouillon">Brouillon</option>
              <option value="publié">Publié</option>
            </select>
            {statut === 'brouillon' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Programmer la publication</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={inputClass}
                />
                {scheduledAt && (
                  <button
                    type="button"
                    onClick={() => setScheduledAt('')}
                    className="mt-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Annuler la programmation
                  </button>
                )}
              </div>
            )}
            <input type="hidden" name="scheduled_at" value={scheduledAt} />
          </div>

          {/* Catégorie */}
          <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
            <label className={labelClass}>Catégorie</label>
            <select name="id_categorie" defaultValue={article?.id_categorie ?? ''} className={inputClass}>
              <option value="">— Aucune —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nom}</option>
              ))}
            </select>
          </div>

          {/* Image de couverture */}
          <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
            <label className={labelClass}>Image de couverture</label>
            <input type="hidden" name="image_couverture" value={imageUrl} />
            <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            {imageUrl && (
              <img src={imageUrl} alt="Couverture" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
            )}
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={imageUploading}
              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {imageUploading ? 'Upload...' : imageUrl ? 'Changer l\'image' : 'Uploader une image'}
            </button>
            <div className="space-y-1.5">
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
                  placeholder={titre || 'Mots-clés pour la recherche…'}
                  className="flex-1 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => handleSuggestImages()}
                  disabled={isLoadingSuggestions || (!suggestionQuery.trim() && !titre.trim())}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-accent-blue/30 text-accent-blue rounded-xl hover:bg-accent-blue/5 disabled:opacity-50 transition-colors flex-shrink-0"
                  title="Suggérer des images"
                >
                  <Images className="w-4 h-4" />
                  {isLoadingSuggestions ? 'Recherche…' : 'Suggérer'}
                </button>
              </div>
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={async () => { setImageUrl(''); setShowSuggestions(false); if (article?.id) await updateArticleImageCouverture(article.id, null) }}
                className="w-full px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Supprimer l&apos;image
              </button>
            )}
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}

            {/* Grille de suggestions Unsplash */}
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
                {suggestionsError && <p className="text-xs text-red-600">{suggestionsError}</p>}
                {isLoadingSuggestions && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                )}
                {!isLoadingSuggestions && imageSuggestions.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {imageSuggestions.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setPreviewPhoto(photo)}
                        className="relative group h-16 overflow-hidden rounded-lg border-2 border-transparent hover:border-accent-blue transition-all"
                        title={`Prévisualiser — ${photo.photographer}`}
                      >
                        <img src={photo.thumb_url} alt={photo.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                        onClick={() => { handleSelectUnsplashPhoto(previewPhoto); setPreviewPhoto(null) }}
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
          <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
            <label htmlFor="meta_description" className={labelClass}>Meta description (SEO)</label>
            <textarea
              id="meta_description" rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y"
              placeholder="Description pour les moteurs de recherche..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
        <button
          type="submit" disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : article?.id ? 'Mettre à jour' : 'Créer l\'article'}
        </button>
        <a href="/admin/blog" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all">
          Annuler
        </a>
      </div>
    </form>
  )
}
