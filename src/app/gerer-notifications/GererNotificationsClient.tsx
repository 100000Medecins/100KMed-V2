'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { updatePrefsByToken } from '@/lib/actions/notifications-public'
import type { NotificationPreferences } from '@/lib/actions/notifications'
import NotificationPreferencesList from '@/components/notifications/NotificationPreferencesList'

interface Props {
  uid: string
  iat: number
  token: string
  initialPrefs: NotificationPreferences
  isEditeur: boolean
  hasSession: boolean
}

export default function GererNotificationsClient({
  uid,
  iat,
  token,
  initialPrefs,
  isEditeur,
  hasSession,
}: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPrefs)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const previous = prefs
    const optimistic = { ...prefs, [key]: value }
    setPrefs(optimistic)
    setError(null)
    startTransition(async () => {
      const result = await updatePrefsByToken({ uid, iat, token, prefs: { [key]: value } })
      if (result.status === 'ok') {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setPrefs(previous)
        setError(
          result.status === 'expired'
            ? 'Ce lien a expiré. Connectez-vous pour modifier vos préférences.'
            : "Erreur lors de l'enregistrement. Réessayez.",
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-navy">Gérer mes préférences de notification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choisissez les emails que vous souhaitez recevoir de 100&nbsp;000 Médecins.
        </p>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-1.5 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          Préférences enregistrées
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      <NotificationPreferencesList
        prefs={prefs}
        onToggle={handleToggle}
        disabled={isPending}
        isEditeur={isEditeur}
      />

      {hasSession && (
        <div className="mt-6 text-center">
          <Link
            href="/mon-compte/mes-notifications"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-blue hover:underline"
          >
            Aller à mon compte
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
