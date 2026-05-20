'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, X } from 'lucide-react'
import {
  generatePersonalAvatar,
  getRemainingAvatarGenerations,
  updateAvatar,
} from '@/lib/actions/user'

interface Props {
  onSelected?: (avatarId: string, url: string) => void
}

const MAX_LENGTH = 300

const PLACEHOLDER_EXAMPLES = [
  'Femme aux cheveux longs roux ondulés, lunettes rondes, blouse blanche avec stéthoscope',
  'Homme barbu cheveux courts noirs, lunettes carrées, scrubs verts de chirurgien',
  'Médecin sénior chauve avec moustache blanche, costume avec cravate rouge',
  'Femme asiatique cheveux courts noirs, sans lunettes, blouse blanche',
]

export default function RequestCustomAvatar({ onSelected }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isExempt, setIsExempt] = useState(false)
  const [description, setDescription] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [placeholderIndex] = useState(() => Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length))

  useEffect(() => {
    if (isOpen && remaining === null) {
      getRemainingAvatarGenerations().then(({ remaining, isExempt }) => {
        setRemaining(remaining)
        setIsExempt(isExempt)
      })
    }
  }, [isOpen, remaining])

  const reset = () => {
    setDescription('')
    setGeneratedUrl(null)
    setGeneratedId(null)
    setError(null)
  }

  const close = () => {
    setIsOpen(false)
    reset()
  }

  const handleGenerate = () => {
    if (description.trim().length < 10) {
      setError('Décrivez votre avatar avec un peu plus de détails (au moins 10 caractères).')
      return
    }

    setError(null)
    setGeneratedUrl(null)
    setGeneratedId(null)
    startTransition(async () => {
      try {
        const result = await generatePersonalAvatar(description)
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
        Aucun ne vous ressemble ? Décrivez votre avatar et nous le générerons pour vous
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
        <h3 className="text-sm font-semibold text-navy">Décrivez votre avatar idéal</h3>
        <p className="text-xs text-gray-600 mt-1">
          Genre, âge, couleur de peau et de cheveux, lunettes, tenue, expression… le style pixel art
          de la galerie sera appliqué automatiquement.
        </p>
        {remaining !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Quota : <strong>{remaining}</strong>{' '}
            {remaining > 1 ? 'générations restantes aujourd\'hui' : 'génération restante aujourd\'hui'} (max 3 / 24h)
            {isExempt && <span className="ml-1 text-accent-blue">— illimité pour votre compte</span>}
          </p>
        )}
      </div>

      {remaining === 0 && !isExempt ? (
        <p className="text-sm text-red-600">
          Vous avez atteint la limite de 3 générations sur 24 heures. Réessayez demain !
        </p>
      ) : (
        <>
          {!generatedUrl && (
            <>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_LENGTH}
                rows={3}
                placeholder={`Exemple : ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
                disabled={isPending}
                className="w-full px-3 py-2 border border-gray-300 rounded-card text-sm focus:outline-none focus:border-accent-blue resize-none"
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{description.length} / {MAX_LENGTH}</span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending || description.trim().length < 10}
                  className="px-4 py-2 bg-accent-blue text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Génération en cours...' : 'Générer mon avatar'}
                </button>
              </div>
            </>
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
                      : 'Consomme un crédit supplémentaire avec la même description'
                  }
                >
                  Pas satisfait ? Re-générer (utilise un crédit)
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={isPending}
                  className="text-xs text-gray-500 hover:underline text-left disabled:opacity-50"
                >
                  Changer la description
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
