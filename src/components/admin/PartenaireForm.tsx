'use client'

import { useState, useTransition, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Field from '@/components/ui/Field'

interface PartenaireFormProps {
  partenaire?: { id: string; nom: string; logo_url: string | null; lien_url: string | null; actif: boolean | null } | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

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

      <Field label="Nom" required htmlFor="nom">
        <Input id="nom" type="text" name="nom" defaultValue={partenaire?.nom ?? ''} required />
      </Field>

      <Field label="Logo">
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
      </Field>

      <Field label="Lien URL (optionnel)" htmlFor="lien_url">
        <Input id="lien_url" type="url" name="lien_url" defaultValue={partenaire?.lien_url ?? ''} placeholder="https://..." />
      </Field>

      <div className="flex items-center gap-4 pt-6 border-t border-gray-100 mt-4">
        <Button loading={isPending}>
          {isPending ? 'Enregistrement...' : partenaire ? 'Mettre à jour' : 'Créer le partenaire'}
        </Button>
        <Button variant="outline" href="/admin/partenaires">Annuler</Button>
      </div>
    </form>
  )
}
