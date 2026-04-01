'use client'

import { useState, useTransition, useRef } from 'react'

interface PartenaireFormProps {
  partenaire?: { id: string; nom: string; logo_url: string | null; lien_url: string | null; actif: boolean | null } | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass = 'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'
const labelClass = 'block text-sm font-medium text-navy mb-1.5'

export default function PartenaireForm({ partenaire, action }: PartenaireFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState(partenaire?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
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
    formData.set('logo_url', logoUrl)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      <div>
        <label htmlFor="nom" className={labelClass}>Nom *</label>
        <input id="nom" type="text" name="nom" defaultValue={partenaire?.nom ?? ''} required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Logo</label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleFileChange} />
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Aperçu" className="h-12 max-w-[120px] object-contain rounded-lg border border-gray-200 bg-white p-1" />
          )}
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              {uploading ? 'Upload...' : logoUrl ? 'Changer le logo' : 'Uploader un logo'}
            </button>
            {logoUrl && (
              <button type="button" onClick={() => setLogoUrl('')}
                className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">
                Supprimer
              </button>
            )}
          </div>
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>

      <div>
        <label htmlFor="lien_url" className={labelClass}>Lien URL (optionnel)</label>
        <input id="lien_url" type="url" name="lien_url" defaultValue={partenaire?.lien_url ?? ''} placeholder="https://..." className={inputClass} />
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <button type="submit" disabled={isPending}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all disabled:opacity-50">
          {isPending ? 'Enregistrement...' : partenaire ? 'Mettre à jour' : 'Créer le partenaire'}
        </button>
        <a href="/admin/partenaires"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all">
          Annuler
        </a>
      </div>
    </form>
  )
}
