'use client'

import { useState, useTransition, useRef } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Play } from 'lucide-react'
import type { Database } from '@/types/database'
import type { TagForSolution } from '@/lib/db/admin-solutions'
import RichTextEditor from '@/components/admin/RichTextEditor'
import FonctionnalitesSection from '@/components/admin/FonctionnalitesSection'
import FonctionnalitesAssocieesSection from '@/components/admin/FonctionnalitesAssocieesSection'

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url)
}

type Solution = Database['public']['Tables']['solutions']['Row']
type Categorie = { id: string; nom: string }
type Editeur = { id: string; nom: string | null }
type GalerieImage = { id?: string; url: string; titre: string | null; ordre: number | null; type?: string | null }

type NoteRedacItem = {
  id: string
  critere_id: string
  label: string
  note_redac_base5: number | null
  avis_redac: string | null
}

interface SolutionFormProps {
  solution?: (Solution & {
    galerie?: GalerieImage[]
    note_redac_base5?: number | null
    categorie_id?: string | null
    editeur_id?: string | null
    website_url?: string | null
    date_lancement?: string | null
    meta_title?: string | null
    meta_description?: string | null
    meta_canonical?: string | null
  }) | null
  categories: Categorie[]
  editeurs: Editeur[]
  notesRedac?: NoteRedacItem[]
  tagsForSolution?: TagForSolution[]
  solutionId?: string
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass =
  'w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y'
const selectClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 appearance-none'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

function Section({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 bg-surface-light hover:bg-surface-muted transition-colors"
      >
        <span className="text-sm font-semibold text-navy">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <div className={`px-6 py-5 space-y-5 ${isOpen ? '' : 'hidden'}`}>{children}</div>
    </div>
  )
}

export default function SolutionForm({ solution, categories, editeurs, notesRedac, tagsForSolution, solutionId, action }: SolutionFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [galerie, setGalerie] = useState<GalerieImage[]>(
    solution?.galerie ?? []
  )
  // State pour les notes_redac (map identifiant_tech -> { note, avis })
  const [notesValues, setNotesValues] = useState<Record<string, { note: string; avis: string }>>(() => {
    const initial: Record<string, { note: string; avis: string }> = {}
    for (const n of notesRedac ?? []) {
      initial[n.critere_id] = {
        note: n.note_redac_base5 != null ? String(n.note_redac_base5) : '',
        avis: n.avis_redac ?? '',
      }
    }
    return initial
  })
  const [description, setDescription] = useState(solution?.description ?? '')
  const [evaluationRedacAvis, setEvaluationRedacAvis] = useState(solution?.evaluation_redac_avis ?? '')
  const [motEditeur, setMotEditeur] = useState(solution?.mot_editeur ?? '')
  const [logoUrl, setLogoUrl] = useState(solution?.logo_url ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const [galerieUploadingIndex, setGalerieUploadingIndex] = useState<number | null>(null)
  const [galerieUploadError, setGalerieUploadError] = useState<string | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const galerieFileInputRef = useRef<HTMLInputElement>(null)
  const galerieBulkInputRef = useRef<HTMLInputElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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
    if (dragIndex === null || dragIndex === dropIndex) { setDragOverIndex(null); return }
    const updated = [...galerie]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setGalerie(updated.map((item, i) => ({ ...item, ordre: i })))
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  async function handleGalerieFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || galerieUploadingIndex === null) return
    setGalerieUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { setGalerieUploadError(json.error ?? 'Erreur upload'); return }
      const updated = [...galerie]
      updated[galerieUploadingIndex] = { ...updated[galerieUploadingIndex], url: json.url }
      setGalerie(updated)
    } catch {
      setGalerieUploadError('Erreur réseau lors de l\'upload')
    } finally {
      setGalerieUploadingIndex(null)
      if (galerieFileInputRef.current) galerieFileInputRef.current.value = ''
    }
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setBulkUploading(true)
    setGalerieUploadError(null)
    const newItems: GalerieImage[] = []
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const json = await res.json()
        if (res.ok) {
          newItems.push({ url: json.url, titre: null, ordre: galerie.length + newItems.length })
        }
      } catch { /* continue */ }
    }
    if (newItems.length) setGalerie([...galerie, ...newItems])
    setBulkUploading(false)
    if (galerieBulkInputRef.current) galerieBulkInputRef.current.value = ''
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { setLogoUploadError(json.error ?? 'Erreur lors de l\'upload'); return }
      setLogoUrl(json.url)
    } catch {
      setLogoUploadError('Erreur réseau lors de l\'upload')
    } finally {
      setLogoUploading(false)
      if (logoFileInputRef.current) logoFileInputRef.current.value = ''
    }
  }
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    apparence: false,
    tarification: false,
    editorial: false,
    criteres: false,
    fonctionnalites: false,
    fonctionnalitesAssociees: false,
    galerie: false,
    dates: false,
    seo: false,
  })

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSubmit(formData: FormData) {
    formData.set('description', description)
    formData.set('evaluation_redac_avis', evaluationRedacAvis)
    formData.set('mot_editeur', motEditeur)
    formData.set('logo_url', logoUrl)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
      )}

      {/* Section 1 — Informations générales */}
      <Section
        title="Informations générales"
        isOpen={openSections.general}
        onToggle={() => toggleSection('general')}
      >
        <div>
          <label htmlFor="nom" className={labelClass}>Nom *</label>
          <input
            id="nom"
            type="text"
            name="nom"
            defaultValue={solution?.nom ?? ''}
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
            defaultValue={solution?.slug ?? ''}
            placeholder="Généré automatiquement si vide"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <RichTextEditor
            initialContent={description}
            onChange={setDescription}
            minHeight={150}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="categorie_id" className={labelClass}>Catégorie</label>
            <select
              id="categorie_id"
              name="categorie_id"
              defaultValue={solution?.categorie_id ?? ''}
              className={selectClass}
            >
              <option value="">— Choisir —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="editeur_id" className="text-sm font-medium text-navy">Éditeur</label>
              <a
                href="/admin/editeurs/nouveau"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
              >
                <Plus className="w-3 h-3" />
                Créer un éditeur
              </a>
            </div>
            <select
              id="editeur_id"
              name="editeur_id"
              defaultValue={solution?.editeur_id ?? ''}
              className={selectClass}
            >
              <option value="">— Choisir —</option>
              {editeurs.map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.nom}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="website_url" className={labelClass}>URL du site</label>
            <input
              id="website_url"
              type="text"
              name="website_url"
              defaultValue={solution?.website_url ?? ''}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Logo</label>
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... ou coller une URL"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {logoUploading ? '⏳ Upload...' : '⬆ Uploader un fichier'}
                </button>
              </div>
            </div>
            {logoUploadError && (
              <p className="mt-1.5 text-xs text-red-500">{logoUploadError}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="version" className={labelClass}>Version</label>
            <input
              id="version"
              type="text"
              name="version"
              defaultValue={solution?.version ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="logo_titre" className={labelClass}>Titre du logo</label>
            <input
              id="logo_titre"
              type="text"
              name="logo_titre"
              defaultValue={solution?.logo_titre ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* Section 2 — Tarification */}
      <Section
        title="Tarification et segments"
        isOpen={openSections.tarification}
        onToggle={() => toggleSection('tarification')}
      >
        <div>
          <label htmlFor="prix" className={labelClass}>Prix (JSON)</label>
          <textarea
            id="prix"
            name="prix"
            defaultValue={(solution as any)?.prix ? JSON.stringify((solution as any).prix, null, 2) : ''}
            rows={4}
            className={textareaClass}
            placeholder='{ "mensuel": 99, "annuel": 990 }'
          />
        </div>
        <div>
          <label htmlFor="segments" className={labelClass}>Segments (JSON)</label>
          <textarea
            id="segments"
            name="segments"
            defaultValue={solution?.segments ? JSON.stringify(solution.segments, null, 2) : ''}
            rows={3}
            className={textareaClass}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="nb_utilisateurs" className={labelClass}>Nb utilisateurs (JSON)</label>
            <textarea
              id="nb_utilisateurs"
              name="nb_utilisateurs"
              defaultValue={solution?.nb_utilisateurs ? JSON.stringify(solution.nb_utilisateurs, null, 2) : ''}
              rows={2}
              className={textareaClass}
            />
          </div>
          <div>
            <label htmlFor="duree_engagement" className={labelClass}>Durée engagement (JSON)</label>
            <textarea
              id="duree_engagement"
              name="duree_engagement"
              defaultValue={solution?.duree_engagement ? JSON.stringify(solution.duree_engagement, null, 2) : ''}
              rows={2}
              className={textareaClass}
            />
          </div>
        </div>
      </Section>

      {/* Section 4 — Contenu éditorial */}
      <Section
        title="Contenu éditorial"
        isOpen={openSections.editorial}
        onToggle={() => toggleSection('editorial')}
      >
        <div>
          <label htmlFor="note_redac_base5" className={labelClass}>Note de la rédaction (/5)</label>
          <input
            id="note_redac_base5"
            type="number"
            name="note_redac_base5"
            min={0}
            max={5}
            step={0.1}
            defaultValue={solution?.note_redac_base5 ?? ''}
            placeholder="Ex : 4.2"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">Note affichée dans le héro et la section avis rédaction (0 à 5)</p>
        </div>
        <div>
          <label className={labelClass}>Avis de la rédaction</label>
          <RichTextEditor
            initialContent={evaluationRedacAvis}
            onChange={setEvaluationRedacAvis}
            minHeight={200}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="evaluation_redac_points_forts" className={labelClass}>Points forts</label>
            <textarea
              id="evaluation_redac_points_forts"
              name="evaluation_redac_points_forts"
              defaultValue={Array.isArray(solution?.evaluation_redac_points_forts) ? solution.evaluation_redac_points_forts.join('\n') : (solution?.evaluation_redac_points_forts ?? '')}
              rows={4}
              placeholder="Un point fort par ligne"
              className={textareaClass}
            />
          </div>
          <div>
            <label htmlFor="evaluation_redac_points_faibles" className={labelClass}>Points faibles</label>
            <textarea
              id="evaluation_redac_points_faibles"
              name="evaluation_redac_points_faibles"
              defaultValue={Array.isArray(solution?.evaluation_redac_points_faibles) ? solution.evaluation_redac_points_faibles.join('\n') : (solution?.evaluation_redac_points_faibles ?? '')}
              rows={4}
              placeholder="Un point faible par ligne"
              className={textareaClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Mot de l&apos;éditeur</label>
          <RichTextEditor
            initialContent={motEditeur}
            onChange={setMotEditeur}
            minHeight={200}
          />
        </div>
      </Section>

      {/* Section 5 — Notes de la rédaction */}
      {notesRedac && notesRedac.length > 0 && (
        <Section
          title={`Notes rédaction (${notesRedac.length})`}
          isOpen={openSections.criteres}
          onToggle={() => toggleSection('criteres')}
        >
          <input
            type="hidden"
            name="criteres_avis_json"
            value={JSON.stringify(
              Object.entries(notesValues).map(([critere_id, v]) => ({
                critere_id,
                note_redac_base5: v.note ? Number(v.note) : null,
                avis_redac: v.avis || null,
              }))
            )}
          />
          <div className="space-y-4">
            {notesRedac.map((n) => (
              <div key={n.critere_id} className="space-y-2">
                <h3 className="text-sm font-semibold text-navy border-b border-gray-100 pb-2">
                  {n.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                  <div>
                    <label className={labelClass}>Avis</label>
                    <RichTextEditor
                      initialContent={notesValues[n.critere_id]?.avis ?? ''}
                      onChange={(html) =>
                        setNotesValues((prev) => ({
                          ...prev,
                          [n.critere_id]: { ...prev[n.critere_id], avis: html },
                        }))
                      }
                      minHeight={120}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Note /5</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={notesValues[n.critere_id]?.note ?? ''}
                      onChange={(e) =>
                        setNotesValues((prev) => ({
                          ...prev,
                          [n.critere_id]: { ...prev[n.critere_id], note: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Section — Fonctionnalités associées (pour filtrage) */}
      {tagsForSolution && solutionId && (
        <Section
          title={`Fonctionnalités (${tagsForSolution.filter((t) => t.enabled).length} associées)`}
          isOpen={openSections.fonctionnalitesAssociees}
          onToggle={() => toggleSection('fonctionnalitesAssociees')}
        >
          <FonctionnalitesAssocieesSection
            solutionId={solutionId}
            initialTags={tagsForSolution}
          />
        </Section>
      )}

      {/* Section — Fonctionnalités principales (affichées sur la page solution) */}
      {tagsForSolution && solutionId && (
        <Section
          title={`Fonctionnalités principales (${tagsForSolution.filter((t) => t.is_principale).length} affichées)`}
          isOpen={openSections.fonctionnalites}
          onToggle={() => toggleSection('fonctionnalites')}
        >
          <FonctionnalitesSection
            solutionId={solutionId}
            initialTags={tagsForSolution}
          />
        </Section>
      )}

      {/* Section 6 — Galerie */}
      <Section
        title={`Galerie (${galerie.filter(g => !isVideoUrl(g.url) && g.type !== 'video').length} image${galerie.filter(g => !isVideoUrl(g.url) && g.type !== 'video').length !== 1 ? 's' : ''}, ${galerie.filter(g => isVideoUrl(g.url) || g.type === 'video').length} vidéo${galerie.filter(g => isVideoUrl(g.url) || g.type === 'video').length !== 1 ? 's' : ''})`}
        isOpen={openSections.galerie}
        onToggle={() => toggleSection('galerie')}
      >
        <input type="hidden" name="galerie_json" value={JSON.stringify(galerie)} />

        {/* Inputs fichiers cachés */}
        <input
          ref={galerieFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleGalerieFileChange}
        />
        <input
          ref={galerieBulkInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={handleBulkUpload}
        />

        {galerieUploadError && (
          <p className="text-xs text-red-500">{galerieUploadError}</p>
        )}

        {galerie.map((img, index) => (
          <div
            key={index}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-start gap-3 p-4 bg-surface-light rounded-xl transition-all ${dragOverIndex === index ? 'ring-2 ring-accent-blue bg-blue-50' : ''}`}
          >
            {/* Drag handle */}
            <div
              draggable
              onDragStart={() => handleDragStart(index)}
              className="cursor-grab active:cursor-grabbing pt-3 text-gray-300 hover:text-gray-500 flex-shrink-0"
              title="Glisser pour réordonner"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            {isVideoUrl(img.url) || img.type === 'video' ? (() => {
              const ytId = img.url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
              return ytId ? (
                <div className="w-24 h-16 rounded-lg border border-gray-200 flex-shrink-0 relative overflow-hidden bg-black">
                  <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-200 flex-shrink-0 flex items-center justify-center bg-gray-50">
                  <Play className="w-6 h-6 text-gray-300" />
                </div>
              )
            })() : (
              img.url && (
                <img
                  src={img.url}
                  alt={img.titre || ''}
                  className="w-24 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />
              )
            )}
            <div className="flex-1 space-y-2">
              {isVideoUrl(img.url) || img.type === 'video' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 shrink-0">
                    <Play className="w-2.5 h-2.5 fill-red-600" /> Vidéo
                  </span>
                  <input
                    type="url"
                    value={img.url}
                    onChange={(e) => {
                      const updated = [...galerie]
                      updated[index] = { ...updated[index], url: e.target.value }
                      setGalerie(updated)
                    }}
                    placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                    className={inputClass}
                  />
                </div>
              ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={img.url}
                  onChange={(e) => {
                    const updated = [...galerie]
                    updated[index] = { ...updated[index], url: e.target.value }
                    setGalerie(updated)
                  }}
                  placeholder="https://..."
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={galerieUploadingIndex === index}
                  onClick={() => { setGalerieUploadingIndex(index); galerieFileInputRef.current?.click() }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {galerieUploadingIndex === index ? '⏳' : '⬆ Upload'}
                </button>
              </div>
              )}
              <input
                type="text"
                value={img.titre ?? ''}
                onChange={(e) => {
                  const updated = [...galerie]
                  updated[index] = { ...updated[index], titre: e.target.value }
                  setGalerie(updated)
                }}
                placeholder="Titre / description (alt)"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setGalerie(galerie.filter((_, i) => i !== index))}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Supprimer cette image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setGalerie([...galerie, { url: '', titre: null, ordre: galerie.length, type: 'image' }])}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter une image (URL)
          </button>
          <button
            type="button"
            disabled={bulkUploading}
            onClick={() => galerieBulkInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {bulkUploading ? 'Upload en cours...' : 'Uploader des images'}
          </button>
          <button
            type="button"
            onClick={() => setGalerie([...galerie, { url: '', titre: null, ordre: galerie.length, type: 'video' }])}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium border-2 border-dashed border-red-200 text-red-400 hover:border-red-500 hover:text-red-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            Ajouter une vidéo YouTube / Vimeo
          </button>
        </div>
      </Section>

      {/* Section 6 — Dates */}
      <Section
        title="Dates et publication"
        isOpen={openSections.dates}
        onToggle={() => toggleSection('dates')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label htmlFor="date_publication" className={labelClass}>Date de publication</label>
            <input
              id="date_publication"
              type="date"
              name="date_publication"
              defaultValue={solution?.date_publication ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_lancement" className={labelClass}>Date de lancement</label>
            <input
              id="date_lancement"
              type="date"
              name="date_lancement"
              defaultValue={solution?.date_lancement ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_maj" className={labelClass}>Date de mise à jour</label>
            <input
              id="date_maj"
              type="date"
              name="date_maj"
              defaultValue={solution?.date_maj ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_debut" className={labelClass}>Date début</label>
            <input
              id="date_debut"
              type="date"
              name="date_debut"
              defaultValue={solution?.date_debut ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date_fin" className={labelClass}>Date fin</label>
            <input
              id="date_fin"
              type="date"
              name="date_fin"
              defaultValue={solution?.date_fin ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* Section 6 — SEO */}
      <Section
        title="SEO"
        isOpen={openSections.seo}
        onToggle={() => toggleSection('seo')}
      >
        <div>
          <label htmlFor="meta_title" className={labelClass}>Meta title</label>
          <input
            id="meta_title"
            type="text"
            name="meta_title"
            defaultValue={solution?.meta_title ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="meta_description" className={labelClass}>Meta description</label>
          <textarea
            id="meta_description"
            name="meta_description"
            defaultValue={solution?.meta_description ?? ''}
            rows={3}
            className={textareaClass}
          />
        </div>
        <div>
          <label htmlFor="meta_canonical" className={labelClass}>Meta canonical</label>
          <input
            id="meta_canonical"
            type="text"
            name="meta_canonical"
            defaultValue={solution?.meta_canonical ?? ''}
            className={inputClass}
          />
        </div>
      </Section>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4 flex-wrap">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending
            ? 'Enregistrement...'
            : solution
              ? 'Mettre à jour'
              : 'Créer la solution'}
        </button>
        {solution && !solution.actif && (
          <button
            type="submit"
            name="_activer"
            value="true"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-rating-green text-white hover:bg-rating-green/90 shadow-soft transition-all disabled:opacity-50"
          >
            Mettre à jour et activer
          </button>
        )}
        <a
          href="/admin/solutions"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
