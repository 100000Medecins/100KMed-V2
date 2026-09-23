'use client'

import { useEffect, useState, useTransition } from 'react'
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/actions/notifications'
import type { NotificationPreferences } from '@/lib/actions/notifications'
import { useAuth } from '@/components/providers/AuthProvider'
import NotificationPreferencesList from '@/components/notifications/NotificationPreferencesList'
import { CheckCircle } from 'lucide-react'

export default function MesNotificationsPage() {
  const { isEditeur } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    relance_emails: true,
    marketing_emails: true,
    etudes_cliniques: false,
    questionnaires_these: false,
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getNotificationPreferences().then((p) => {
      setPrefs(p)
      setLoading(false)
    })
  }, [])

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    startTransition(async () => {
      await updateNotificationPreferences({ [key]: value })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement de vos préférences...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy">Mes notifications</h1>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            Préférences enregistrées
          </div>
        )}
      </div>

      <NotificationPreferencesList
        prefs={prefs}
        onToggle={handleToggle}
        disabled={isPending}
        isEditeur={isEditeur}
        showEtudesLink
      />
    </div>
  )
}
