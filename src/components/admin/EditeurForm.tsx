'use client'

import { useState, useTransition, useRef } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import type { EditeurSuggestion } from '@/lib/actions/searchEditeur'

interface Editeur {
  id: string
  nom: string | null
  nom_commercial: string | null
  description: string | null
  logo_url: string | null
  logo_titre: string | null
  website: string | null
  contact_email: string | null
  contact_telephone: string | null
  contact_adresse: string | null
  contact_cp: string | null
  contact_ville: string | null
  contact_pays: string | null
  nb_employes: number | null
  siret: string | null
  mot_editeur: string | null
}

interface EditeurFormProps {
  editeur?: Editeur | null
  initialValues?: EditeurSuggestion
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

export default function EditeurForm({ editeur, initialValues, action }: EditeurFormProps) {
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
          <div>
            <label htmlFor="nom" className={labelClass}>Nom (interne) *</label>
            <input
              id="nom"
              type="text"
              name="nom"
              defaultValue={editeur?.nom ?? v?.nom ?? ''}
              required
              className={inputClass}
              placeholder="Ex: CEGEDIM SA"
            />
          </div>
          <div>
            <label htmlFor="nom_commercial" className={labelClass}>Nom commercial</label>
            <input
              id="nom_commercial"
              type="text"
              name="nom_commercial"
              defaultValue={editeur?.nom_commercial ?? v?.nom_commercial ?? ''}
              className={inputClass}
              placeholder="Ex: Cegedim"
            />
          </div>
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
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Aperçu"
                className="h-14 max-w-[140px] object-contain rounded-xl border border-gray-200 bg-white p-2"
              />
            )}
            <div className="flex flex-col gap-2">
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

      <Section title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_email" className={labelClass}>Email</label>
            <input
              id="contact_email"
              type="email"
              name="contact_email"
              defaultValue={editeur?.contact_email ?? v?.contact_email ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact_telephone" className={labelClass}>Téléphone</label>
            <input
              id="contact_telephone"
              type="text"
              name="contact_telephone"
              defaultValue={editeur?.contact_telephone ?? v?.contact_telephone ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact_adresse" className={labelClass}>Adresse</label>
          <input
            id="contact_adresse"
            type="text"
            name="contact_adresse"
            defaultValue={editeur?.contact_adresse ?? v?.contact_adresse ?? ''}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="contact_cp" className={labelClass}>Code postal</label>
            <input
              id="contact_cp"
              type="text"
              name="contact_cp"
              defaultValue={editeur?.contact_cp ?? v?.contact_cp ?? ''}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
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
          <label htmlFor="nb_employes" className={labelClass}>Nombre d'employés</label>
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

      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : editeur ? 'Mettre à jour' : "Créer l'éditeur"}
        </button>
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
