'use client'

import { useRef, useState } from 'react'

interface ImageUploadFieldProps {
  /** URL courante (contrôlé). */
  value: string
  /** Appelé avec la nouvelle URL (après upload ou saisie manuelle), ou '' si supprimé. */
  onChange: (url: string) => void
  /** Types acceptés (attribut `accept` de l'input file). */
  accept?: string
  /** Placeholder du champ URL. */
  placeholder?: string
  /** Classe du champ texte URL (pour s'aligner sur le style du formulaire hôte). */
  inputClassName?: string
  /** Classe de l'aperçu (taille/forme selon le contexte). */
  previewClassName?: string
  /** Libellé du bouton d'upload quand aucune image (défaut « Uploader un logo »). */
  uploadLabel?: string
}

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'
const DEFAULT_INPUT =
  'w-full rounded-button bg-white border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
const DEFAULT_PREVIEW =
  'h-14 max-w-[140px] object-contain rounded-xl border border-gray-200 bg-white p-2 flex-shrink-0'

/**
 * Champ d'image réutilisable : aperçu + saisie d'URL + upload de fichier
 * (via `/api/upload`, bucket `images`) + suppression. Contrôlé par `value`/`onChange`.
 * Remplace le pattern copié-collé dans les formulaires (admin + espace éditeur).
 */
export default function ImageUploadField({
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  placeholder = 'https://… ou coller une URL',
  inputClassName = DEFAULT_INPUT,
  previewClassName = DEFAULT_PREVIEW,
  uploadLabel = 'Uploader un logo',
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
      if (!res.ok) {
        setUploadError(json.error ?? 'Erreur upload')
        return
      }
      onChange(json.url)
    } catch {
      setUploadError('Erreur réseau')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-start gap-3">
        {value && <img src={value} alt="Aperçu" className={previewClassName} />}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClassName}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm border border-gray-200 rounded-button hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? 'Upload…' : value ? 'Changer le logo' : uploadLabel}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-button hover:bg-red-50"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
      {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
    </div>
  )
}
