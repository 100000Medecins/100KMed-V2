'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAdmin } from '@/lib/actions/admin'
import { ShieldCheck } from 'lucide-react'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button loading={pending} fullWidth>
      {pending ? 'Connexion...' : 'Accéder au backoffice'}
    </Button>
  )
}

export default function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await loginAdmin(formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto px-6">
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-accent-blue" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">Administration</h1>
        <p className="text-gray-500 text-sm mb-8">
          Entrez le mot de passe pour accéder au backoffice.
        </p>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}
        <form action={handleSubmit}>
          <PasswordInput
            name="password"
            placeholder="Mot de passe"
            required
            className="w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3 mb-4"
            wrapperClassName="mb-4"
          />
          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
