'use client'

import { useState, useTransition, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Trash2, ImageIcon, Loader2, ExternalLink } from 'lucide-react'
import type { EtudeClinique } from '@/lib/actions/etudes-cliniques'
import SpecialitesSelector from '@/components/admin/SpecialitesSelector'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false })

type Props = {
  etude?: EtudeClinique
  onSave: (formData: FormData) => Promise<void>
  onCancel: () => void
}

export default function EtudeForm({ etude, onSave, onCancel }: Props) {
  const [titre, setTitre] = useState(etude?.titre ?? '')
  const [description, setDescription] = useState(etude?.description ?? '')
  const [lien, setLien] = useState(etude?.lien ?? '')
  const [dateDebut, setDateDebut] = useState(etude?.date_debut ?? '')
  const [dateFin, setDateFin] = useState(etude?.date_fin ?? '')
  const [images, setImages] = useState<string[]>(etude?.images ?? [])
  const [specialites_cibles, setSpecialitesCibles] = useState<string[]>(etude?.specialites_cibles ?? [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'etudes')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) setImages((prev) => [...prev, json.url])
      else setError(json.error || "Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) { setError('Le titre est requis'); return }
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('titre', titre)
      fd.append('description', description)
      fd.append('lien', lien)
      fd.append('images', JSON.stringify(images))
      fd.append('specialites_cibles', JSON.stringify(specialites_cibles))
      fd.append('date_debut', dateDebut)
      fd.append('date_fin', dateFin)
      await onSave(fd)
    })
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 text-sm text-gray-700 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50'
  const labelClass = 'block text-sm font-medium text-navy mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

      <div>
        <label className={labelClass}>Titre *</label>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} className={inputClass} placeholder="Nom de l'étude" required />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <RichTextEditor initialContent={description} onChange={setDescription} />
      </div>

      <div>
        <label className={labelClass}>Lien vers l'étude</label>
        <div className="relative">
          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={lien} onChange={(e) => setLien(e.target.value)} className={`${inputClass} pl-9`} placeholder="https://..." type="url" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date de début d'affichage</label>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date de fin d'affichage</label>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Images</label>
        <div className="space-y-3">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {uploading ? 'Upload en cours…' : 'Ajouter une image'}
          </button>
        </div>
      </div>

      <SpecialitesSelector value={specialites_cibles} onChange={setSpecialitesCibles} />

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending || uploading}
          className="flex items-center gap-2 px-5 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy-dark transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {etude ? 'Enregistrer' : 'Créer l\'étude'}
        </button>
      </div>
    </form>
  )
}
