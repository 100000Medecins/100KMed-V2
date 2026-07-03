'use client'

import { useState, useTransition } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Field from '@/components/ui/Field'
import ImageUploadField from '@/components/ui/ImageUploadField'

interface PartenaireFormProps {
  partenaire?: { id: string; nom: string; logo_url: string | null; lien_url: string | null; actif: boolean | null } | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

export default function PartenaireForm({ partenaire, action }: PartenaireFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState(partenaire?.logo_url ?? '')

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
        <ImageUploadField
          value={logoUrl}
          onChange={setLogoUrl}
          previewClassName="h-12 max-w-[120px] object-contain rounded-lg border border-gray-200 bg-white p-1 flex-shrink-0"
        />
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
