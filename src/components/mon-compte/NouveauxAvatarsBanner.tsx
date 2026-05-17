'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, ChevronDown } from 'lucide-react'
import { getNouveauxAvatarsBannerData, updateAvatar } from '@/lib/actions/user'

interface Avatar {
  id: string
  url: string
  isPersonal: boolean
}

const COOKIE_KEY = 'avatars_banner_dismissed'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 an

// Index choisis pour l'illustration (5 avatars variés à intervalles réguliers)
const ILLUSTRATION_INDICES = [0, 14, 27, 49, 55]

function isDismissed(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE_KEY}=1`))
}

function setDismissed(): void {
  document.cookie = `${COOKIE_KEY}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export default function NouveauxAvatarsBanner() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (isDismissed()) return
    getNouveauxAvatarsBannerData().then(({ shouldShow, avatars }) => {
      if (shouldShow) {
        setAvatars(avatars)
        setVisible(true)
      }
    })
  }, [])

  // Re-check si l'user choisit un avatar via la page profil (sauve via le bouton du form)
  useEffect(() => {
    const handler = () => {
      getNouveauxAvatarsBannerData().then(({ shouldShow }) => {
        if (!shouldShow) setVisible(false)
      })
    }
    window.addEventListener('avatar-changed', handler)
    return () => window.removeEventListener('avatar-changed', handler)
  }, [])

  if (!visible) return null

  const handleSelect = (avatarId: string) => {
    startTransition(async () => {
      await updateAvatar(avatarId)
      setVisible(false)
      // Notifie la page profil (et tout autre composant) du nouvel avatar choisi
      window.dispatchEvent(new CustomEvent('avatar-changed', { detail: { avatarId } }))
      router.refresh()
    })
  }

  const handleDismiss = () => {
    setDismissed()
    setVisible(false)
  }

  const illustration = ILLUSTRATION_INDICES.map((i) => avatars[i]).filter(Boolean)

  return (
    <div className="relative bg-gradient-to-br from-accent-blue/10 to-accent-yellow/5 border border-accent-blue/20 rounded-card mb-6 overflow-hidden">
      <button
        onClick={handleDismiss}
        aria-label="Ne plus afficher cette bannière"
        title="Ne plus afficher cette bannière"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-white/30 transition-colors pr-12"
      >
        <Sparkles className="w-6 h-6 text-accent-blue flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-navy">Nouveaux avatars disponibles !</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {expanded
              ? 'Cliquez sur celui qui vous ressemble pour le choisir.'
              : 'Découvrez les nouveaux avatars pixel art et choisissez le vôtre.'}
          </p>
        </div>

        {/* Illustration : 5 avatars chevauchés (masqués quand déroulé) */}
        {!expanded && illustration.length > 0 && (
          <div className="hidden sm:flex items-center flex-shrink-0">
            {illustration.map((a, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={a.id}
                src={a.url}
                alt=""
                className={`w-10 h-10 rounded-full bg-surface-light border-2 border-white object-cover ${i > 0 ? '-ml-3' : ''}`}
                style={{ zIndex: illustration.length - i }}
              />
            ))}
          </div>
        )}

        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-3">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.id)}
                disabled={isPending}
                className="aspect-square rounded-full overflow-hidden bg-surface-light border-2 border-transparent hover:border-accent-blue hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Choisir cet avatar"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <div className="flex justify-end text-sm">
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xs underline underline-offset-2"
            >
              Ne plus jamais m&apos;afficher cette bannière
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
