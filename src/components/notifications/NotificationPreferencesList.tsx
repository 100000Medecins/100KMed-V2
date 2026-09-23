'use client'

import Link from 'next/link'
import { Bell, RefreshCw, Mail, FlaskConical, BookOpen } from 'lucide-react'
import Card from '@/components/ui/Card'
import type { NotificationPreferences } from '@/lib/actions/notifications'

/**
 * Liste des préférences de notification (4 interrupteurs + note « emails de compte »).
 * Partagée par /mon-compte/mes-notifications, /gerer-notifications (lien de désabo)
 * et /completer-profil. Composant contrôlé : l'enregistrement reste au parent
 * (session, jeton HMAC, ou envoi groupé à la validation du profil).
 */

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
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

function Row({
  icon,
  iconBg,
  title,
  badge,
  children,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  badge?: string
  children: React.ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-navy text-sm">{title}</p>
            {badge && <span className="text-xs text-emerald-600 font-medium">{badge}</span>}
          </div>
          {children}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}

interface Props {
  prefs: NotificationPreferences
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void
  disabled?: boolean
  /** Les éditeurs ne voient que « Annonces et nouveautés ». */
  isEditeur?: boolean
  /** Lien vers l'onglet Études cliniques (uniquement depuis l'espace connecté). */
  showEtudesLink?: boolean
}

export default function NotificationPreferencesList({
  prefs,
  onToggle,
  disabled,
  isEditeur = false,
  showEtudesLink = false,
}: Props) {
  return (
    <Card padding="none" className="divide-y divide-gray-100">
      {!isEditeur && (
        <Row
          icon={<RefreshCw className="w-4 h-4 text-accent-blue" />}
          iconBg="bg-accent-blue/10"
          title="Rappels de revalidation"
          checked={prefs.relance_emails}
          onChange={(v) => onToggle('relance_emails', v)}
          disabled={disabled}
        >
          <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
            Recevez un email lorsque votre avis sur un logiciel date de plus d&apos;un an,
            pour confirmer qu&apos;il est toujours d&apos;actualité.
          </p>
        </Row>
      )}

      <Row
        icon={<Bell className="w-4 h-4 text-purple-500" />}
        iconBg="bg-purple-50"
        title="Annonces et nouveautés"
        checked={prefs.marketing_emails}
        onChange={(v) => onToggle('marketing_emails', v)}
        disabled={disabled}
      >
        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
          Recevez les actualités de 100 000 Médecins : nouvelles fonctionnalités,
          mises à jour importantes, événements.
        </p>
      </Row>

      {!isEditeur && (
        <Row
          icon={<FlaskConical className="w-4 h-4 text-emerald-500" />}
          iconBg="bg-emerald-50"
          title="Études cliniques"
          badge="avec le Digital Medical Hub"
          checked={prefs.etudes_cliniques}
          onChange={(v) => onToggle('etudes_cliniques', v)}
          disabled={disabled}
        >
          <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
            Recevez des informations à propos d&apos;études cliniques sur de nouveaux logiciels
            médicaux ou appareils connectés en santé.
          </p>
          {showEtudesLink && (
            <p className="text-xs text-emerald-600 mt-1">
              Plus d&apos;informations dans l&apos;onglet{' '}
              <Link href="/mon-compte/etudes-cliniques" className="font-medium underline hover:text-emerald-700">
                Études cliniques
              </Link>.
            </p>
          )}
        </Row>
      )}

      {!isEditeur && (
        <Row
          icon={<BookOpen className="w-4 h-4 text-amber-500" />}
          iconBg="bg-amber-50"
          title="Questionnaires de recherche"
          checked={prefs.questionnaires_these}
          onChange={(v) => onToggle('questionnaires_these', v)}
          disabled={disabled}
        >
          <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
            Répondez à des questionnaires de thèse ou des études académiques
            sur le thème de l&apos;e-santé.
          </p>
        </Row>
      )}

      <div className="flex items-start gap-3 p-5 bg-surface-light">
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
    </Card>
  )
}
