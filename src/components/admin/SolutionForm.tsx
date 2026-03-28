'use client'

import { useState, useTransition, useRef } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { Database } from '@/types/database'
import RichTextEditor from '@/components/admin/RichTextEditor'

type Solution = Database['public']['Tables']['solutions']['Row']
type Categorie = { id: string; nom: string }
type Editeur = { id: string; nom: string }
type GalerieImage = { id?: string; url: string; titre: string | null; ordre: number | null }

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

export default function SolutionForm({ solution, categories, editeurs, notesRedac, action }: SolutionFormProps) {
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
            <label htmlFor="editeur_id" className={labelClass}>Éditeur</label>
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
            <label htmlFor="logo_url" className={labelClass}>URL du logo</label>
            <input
              id="logo_url"
              type="text"
              name="logo_url"
              defaultValue={solution?.logo_url ?? ''}
              placeholder="chemin ou https://..."
              className={inputClass}
            />
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
            defaultValue={solution?.prix ? JSON.stringify(solution.prix, null, 2) : ''}
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

      {/* Section 6 — Galerie */}
      <Section
        title={`Galerie d'images (${galerie.length})`}
        isOpen={openSections.galerie}
        onToggle={() => toggleSection('galerie')}
      >
        <input type="hidden" name="galerie_json" value={JSON.stringify(galerie)} />

        {galerie.map((img, index) => (
          <div key={index} className="flex items-start gap-3 p-4 bg-surface-light rounded-xl">
            <div className="flex-1 space-y-3">
              <div>
                <label className={labelClass}>URL de l&apos;image *</label>
                <input
                  type="text"
                  value={img.url}
                  onChange={(e) => {
                    const updated = [...galerie]
                    updated[index] = { ...updated[index], url: e.target.value }
                    setGalerie(updated)
                  }}
                  placeholder="/images/solutions/... ou https://..."
                  required
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Titre / alt</label>
                  <input
                    type="text"
                    value={img.titre ?? ''}
                    onChange={(e) => {
                      const updated = [...galerie]
                      updated[index] = { ...updated[index], titre: e.target.value }
                      setGalerie(updated)
                    }}
                    placeholder="Description de l'image"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ordre</label>
                  <input
                    type="number"
                    value={img.ordre ?? 0}
                    onChange={(e) => {
                      const updated = [...galerie]
                      updated[index] = { ...updated[index], ordre: Number(e.target.value) }
                      setGalerie(updated)
                    }}
                    min={0}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            {img.url && (
              <img
                src={img.url}
                alt={img.titre || ''}
                className="w-20 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              />
            )}
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

        <button
          type="button"
          onClick={() => setGalerie([...galerie, { url: '', titre: null, ordre: galerie.length }])}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une image
        </button>
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
      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
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
