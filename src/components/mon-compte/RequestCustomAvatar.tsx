'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Sparkles, Loader2, X } from 'lucide-react'
import {
  generatePersonalAvatar,
  getRemainingAvatarGenerations,
  updateAvatar,
} from '@/lib/actions/user'

interface Props {
  onSelected?: (avatarId: string, url: string) => void
}

export default function RequestCustomAvatar({ onSelected }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isExempt, setIsExempt] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && remaining === null) {
      getRemainingAvatarGenerations().then(({ remaining, isExempt }) => {
        setRemaining(remaining)
        setIsExempt(isExempt)
      })
    }
  }, [isOpen, remaining])

  const reset = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setGeneratedUrl(null)
    setGeneratedId(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const close = () => {
    setIsOpen(false)
    reset()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La photo doit faire moins de 5 Mo')
      return
    }

    setError(null)
    setGeneratedUrl(null)
    setGeneratedId(null)
    setPhotoFile(file)

    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleGenerate = () => {
    if (!photoFile) {
      setError('Aucune photo sélectionnée')
      return
    }

    setError(null)
    setGeneratedUrl(null)
    setGeneratedId(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('photo', photoFile)
        const result = await generatePersonalAvatar(formData)
        setGeneratedUrl(result.url)
        setGeneratedId(result.avatarId)
        setRemaining(result.remaining)
        setIsExempt(result.isExempt)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    })
  }

  const handleSelect = () => {
    if (!generatedId || !generatedUrl) return
    startTransition(async () => {
      try {
        await updateAvatar(generatedId)
        onSelected?.(generatedId, generatedUrl)
        router.refresh()
        close()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la sélection')
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm text-accent-blue hover:underline inline-flex items-center gap-1.5"
      >
        <Sparkles className="w-4 h-4" />
        Aucun ne te ressemble ? Génère ton avatar à partir d&apos;une photo
      </button>
    )
  }

  return (
    <div className="border border-accent-blue/30 rounded-card bg-gradient-to-br from-accent-blue/5 to-accent-yellow/5 p-4 space-y-3 relative">
      <button
        type="button"
        onClick={close}
        aria-label="Fermer"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-8">
        <h3 className="text-sm font-semibold text-navy">Générer mon avatar personnalisé</h3>
        {remaining !== null && (
          <p className="text-xs text-gray-600 mt-1">
            Quota : <strong>{remaining}</strong>{' '}
            {remaining > 1 ? 'générations restantes aujourd\'hui' : 'génération restante aujourd\'hui'} (max 3 / 24h)
            {isExempt && <span className="ml-1 text-accent-blue">— illimité pour ton compte</span>}
          </p>
        )}
      </div>

      {remaining === 0 && !isExempt ? (
        <p className="text-sm text-red-600">
          Tu as atteint la limite de 3 générations sur 24 heures. Réessaye demain !
        </p>
      ) : (
        <>
          {!photoPreview && (
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-card cursor-pointer hover:border-accent-blue hover:bg-white transition-colors text-sm">
                <Upload className="w-4 h-4" />
                Choisir une photo (max 5 Mo)
              </span>
            </label>
          )}

          {photoPreview && !generatedUrl && (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Aperçu de ta photo"
                className="w-20 h-20 rounded-card object-cover border border-gray-200"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="px-4 py-2 bg-accent-blue text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Génération en cours...' : 'Générer mon avatar'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs text-gray-500 hover:underline text-left"
                  disabled={isPending}
                >
                  Changer de photo
                </button>
              </div>
            </div>
          )}

          {generatedUrl && (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedUrl}
                alt="Avatar généré"
                className="w-20 h-20 rounded-full object-cover bg-surface-light border border-gray-200"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={isPending}
                  className="px-4 py-2 bg-accent-blue text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Le choisir comme avatar
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending || (remaining === 0 && !isExempt)}
                  className="text-xs text-gray-500 hover:underline text-left disabled:opacity-50"
                  title={
                    remaining === 0 && !isExempt
                      ? 'Plus de crédit aujourd\'hui'
                      : 'Consomme un crédit supplémentaire'
                  }
                >
                  Pas satisfait ? Re-générer (utilise un crédit)
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  )
}
