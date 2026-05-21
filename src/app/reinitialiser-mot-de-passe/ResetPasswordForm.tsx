'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { resetPasswordWithToken } from '@/lib/actions/user'

export default function ResetPasswordForm({
  uid,
  iat,
  token,
}: {
  uid: string
  iat: number
  token: string
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    const res = await resetPasswordWithToken(uid, iat, token, password)
    if (res.error) {
      setError(res.error)
      setSubmitting(false)
    } else {
      window.location.href = '/connexion?reset=success'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-navy mb-1">Nouveau mot de passe</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
          placeholder="6 caractères minimum"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">Confirmer le mot de passe</label>
        <PasswordInput
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
          placeholder="6 caractères minimum"
        />
      </div>
      <Button
        variant="primary"
        className={`w-full justify-center ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {submitting ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
      </Button>
    </form>
  )
}
