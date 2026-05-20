'use client'

import { useState, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ImageIcon, Trash2 } from 'lucide-react'

const RichTextEditorLight = dynamic(() => import('@/components/admin/RichTextEditorLight'), { ssr: false })

export default function QuestionnaireTheseForm({ redirectOnSuccess }: { redirectOnSuccess?: string }) {
  const router = useRouter()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [lien, setLien] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setFormError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'questionnaires-these')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) setImageUrl(json.url)
      else setFormError(json.error || "Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const { deposerQuestionnaire } = await import('@/lib/actions/questionnaires-these')
      const result = await deposerQuestionnaire({
        titre: titre.trim(),
        description: description.trim() || undefined,
        lien: lien.trim(),
        image_url: imageUrl.trim() || undefined,
        date_fin: dateFin,
      })

      if (result.error) {
        setFormError(result.error)
        return
      }

      setTitre('')
      setDescription('')
      setLien('')
      setImageUrl('')
      setDateFin('')
      setFormSuccess(true)
      if (redirectOnSuccess) {
        setTimeout(() => router.push(redirectOnSuccess), 1200)
      } else {
        setTimeout(() => setFormSuccess(false), 4000)
      }
    })
  }

  if (formSuccess) {
    return (
      <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2">
        <CheckCircle className="w-4 h-4 shrink-0" />
        Questionnaire déposé — il sera visible après validation par l&apos;équipe.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Titre de la thèse *</label>
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
            placeholder="Ex. : Impact de la télémédecine sur les déserts médicaux"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <RichTextEditorLight
            initialContent={description}
            onChange={setDescription}
            minHeight={150}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lien vers le questionnaire *</label>
          <input
            type="url"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
            placeholder="https://forms.gle/..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin de collecte *</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            required
            min={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
          />
          <p className="text-xs text-gray-400 mt-1">Le questionnaire ne sera plus affiché après cette date.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Image / affiche <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>

          {imageUrl ? (
            <div className="relative inline-block">
              <img src={imageUrl} alt="" className="max-h-40 rounded-xl border border-gray-100" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Retirer l'image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {uploading ? 'Upload en cours…' : 'Ajouter une image'}
                </button>
                <span className="text-xs text-gray-400">ou</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  placeholder="Coller une URL d'image"
                />
              </div>
            </div>
          )}
        </div>

        {formError && <p className="text-xs text-red-600">{formError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? 'Envoi...' : 'Déposer'}
          </button>
        </div>
      </form>
    </div>
  )
}
