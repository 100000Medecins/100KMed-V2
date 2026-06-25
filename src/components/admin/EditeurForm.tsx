'use client'

import { useState, useTransition, useRef } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Field from '@/components/ui/Field'
import type { EditeurSuggestion } from '@/lib/actions/searchEditeur'

interface Editeur {
  id: string
  nom: string | null
  nom_commercial: string | null
  description: string | null
  logo_url: string | null
  logo_titre: string | null
  website: string | null
  contact_ville: string | null
  contact_pays: string | null
  nb_employes: number | null
  siret: string | null
  mot_editeur: string | null
  affiche_sur_index?: boolean | null
  parent_id?: string | null
}

interface EditeurFormProps {
  editeur?: Editeur | null
  initialValues?: EditeurSuggestion
  /** Liste des éditeurs sélectionnables comme maison-mère (déjà filtrée : exclut l'éditeur courant). */
  parentOptions?: { id: string; nom: string }[]
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const textareaClass =
  'w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 resize-y'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function EditeurForm({ editeur, initialValues, parentOptions, action }: EditeurFormProps) {
  const v = initialValues // alias court
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState(v?.description ?? editeur?.description ?? '')
  const [logoUrl, setLogoUrl] = useState(v?.logo_url ?? editeur?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setUploadError(json.error ?? 'Erreur upload'); return }
      setLogoUrl(json.url)
    } catch {
      setUploadError('Erreur réseau')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set('description', description)
    formData.set('logo_url', logoUrl)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
      )}

      <Section title="Identité">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom (interne)" required htmlFor="nom">
            <Input
              id="nom"
              type="text"
              name="nom"
              defaultValue={editeur?.nom ?? v?.nom ?? ''}
              required
              placeholder="Ex: CEGEDIM SA"
            />
          </Field>
          <Field label="Nom commercial" htmlFor="nom_commercial">
            <Input
              id="nom_commercial"
              type="text"
              name="nom_commercial"
              defaultValue={editeur?.nom_commercial ?? v?.nom_commercial ?? ''}
              placeholder="Ex: Cegedim"
            />
          </Field>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <RichTextEditor initialContent={description} onChange={setDescription} />
        </div>

        <div>
          <label className={labelClass}>Logo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-start gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Aperçu"
                className="h-14 max-w-[140px] object-contain rounded-xl border border-gray-200 bg-white p-2 flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-2">
              {/* Champ URL (coller un lien externe) — en miroir de la fiche solution. */}
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... ou coller une URL"
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? 'Upload...' : logoUrl ? 'Changer le logo' : 'Uploader un logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          <div className="mt-3">
            <label htmlFor="logo_titre" className={labelClass}>Texte alternatif du logo</label>
            <input
              id="logo_titre"
              type="text"
              name="logo_titre"
              defaultValue={editeur?.logo_titre ?? ''}
              className={inputClass}
              placeholder="Ex: Logo Cegedim"
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className={labelClass}>Site web</label>
          <input
            id="website"
            type="url"
            name="website"
            defaultValue={editeur?.website ?? v?.website ?? ''}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
      </Section>

      <Section title="Localisation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_ville" className={labelClass}>Ville</label>
            <input
              id="contact_ville"
              type="text"
              name="contact_ville"
              defaultValue={editeur?.contact_ville ?? v?.contact_ville ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact_pays" className={labelClass}>Pays</label>
            <input
              id="contact_pays"
              type="text"
              name="contact_pays"
              defaultValue={editeur?.contact_pays ?? v?.contact_pays ?? 'France'}
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      <Section title="Informations complémentaires">
        <div>
          <label htmlFor="nb_employes" className={labelClass}>Nombre d&apos;employés</label>
          <input
            id="nb_employes"
            type="number"
            name="nb_employes"
            defaultValue={editeur?.nb_employes ?? v?.nb_employes ?? ''}
            className={inputClass}
            min={0}
          />
        </div>

      </Section>

      {parentOptions && parentOptions.length > 0 && (
        <Section title="Maison-mère (groupe)">
          <div>
            <label htmlFor="parent_id" className={labelClass}>Éditeur parent</label>
            <select
              id="parent_id"
              name="parent_id"
              defaultValue={editeur?.parent_id ?? ''}
              className={inputClass}
            >
              <option value="">— Aucune (éditeur indépendant)</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Si cet éditeur est une marque rachetée (ex. Prokov par Equasens), choisissez sa maison-mère.
              Un compte éditeur rattaché à la maison-mère pourra gérer les solutions de toutes ses filiales.
            </p>
          </div>
        </Section>
      )}

      <Section title="Visibilité publique">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="affiche_sur_index"
            defaultChecked={editeur?.affiche_sur_index ?? false}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-accent-blue focus:ring-2 focus:ring-accent-blue/30"
          />
          <span className="text-sm text-gray-700">
            <span className="font-medium text-navy">Lister cet éditeur sur la page publique /editeurs</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              À activer une fois la fiche complète (logo, description, …). Décocher si la page éditeur n&apos;est pas prête à être exposée.
            </span>
          </span>
        </label>
      </Section>

      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <Button loading={isPending}>
          {isPending ? 'Enregistrement...' : editeur ? 'Mettre à jour' : "Créer l'éditeur"}
        </Button>
        <a
          href="/admin/editeurs"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
