'use client'

import { useEffect, useState, useTransition } from 'react'
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/actions/notifications'
import { Bell, RefreshCw, Mail, CheckCircle, FlaskConical, BookOpen } from 'lucide-react'

interface Prefs {
  relance_emails: boolean
  marketing_emails: boolean
  etudes_cliniques: boolean
  questionnaires_these: boolean
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-accent-blue' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function MesNotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>({
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

  function handleToggle(key: keyof Prefs, value: boolean) {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    // Notifier le layout immédiatement pour afficher/masquer l'onglet Études cliniques
    if (key === 'etudes_cliniques') {
      window.dispatchEvent(new CustomEvent('etudes-optin-change', { detail: value }))
    }
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

      <div className="bg-white rounded-card shadow-card divide-y divide-gray-100">

        {/* Relances évaluations */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <p className="font-medium text-navy text-sm">Rappels de revalidation</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Recevez un email lorsque votre avis sur un logiciel date de plus d&apos;un an,
                pour confirmer qu&apos;il est toujours d&apos;actualité.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs.relance_emails}
            onChange={(v) => handleToggle('relance_emails', v)}
            disabled={isPending}
          />
        </div>

        {/* Emails marketing / annonces */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-navy text-sm">Annonces et nouveautés</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Recevez les actualités de 100 000 Médecins : nouvelles fonctionnalités,
                mises à jour importantes, événements.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs.marketing_emails}
            onChange={(v) => handleToggle('marketing_emails', v)}
            disabled={isPending}
          />
        </div>

        {/* Études cliniques */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-navy text-sm">Études cliniques</p>
                <span className="text-xs text-emerald-600 font-medium">avec le Digital Medica Hub</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Participez à des études sur l&apos;essai de nouveaux logiciels médicaux
                ou d&apos;appareils connectés en santé.
              </p>
              <p className="text-xs text-gray-400 mt-1 italic">Plus d&apos;informations prochainement.</p>
            </div>
          </div>
          <Toggle
            checked={prefs.etudes_cliniques}
            onChange={(v) => handleToggle('etudes_cliniques', v)}
            disabled={isPending}
          />
        </div>

        {/* Questionnaires de thèse / e-santé */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-navy text-sm">Questionnaires de recherche</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Répondez à des questionnaires de thèse ou des études académiques
                sur le thème de l&apos;e-santé.
              </p>
              <p className="text-xs text-gray-400 mt-1 italic">Plus d&apos;informations prochainement.</p>
            </div>
          </div>
          <Toggle
            checked={prefs.questionnaires_these}
            onChange={(v) => handleToggle('questionnaires_these', v)}
            disabled={isPending}
          />
        </div>

        {/* Note transactionnels */}
        <div className="flex items-start gap-3 p-5 bg-surface-light rounded-b-card">
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-500 text-sm">Emails de compte</p>
            <p className="text-xs text-gray-400 mt-0.5 max-w-sm">
              Les emails liés à votre compte (vérification d&apos;identité, sécurité) sont
              toujours envoyés et ne peuvent pas être désactivés.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
