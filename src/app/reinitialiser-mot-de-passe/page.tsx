'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck } from 'lucide-react'

function ReinitialiserContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function initialize() {
      // Flux PKCE : ?code= dans les search params
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError('Le lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.')
        } else {
          setReady(true)
        }
        return
      }

      // Flux implicite : @supabase/ssr ne traite pas le hash automatiquement,
      // il faut parser manuellement #access_token=...&type=recovery
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            setError('Le lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.')
          } else {
            setReady(true)
          }
          return
        }
      }

      // Vérifier s'il y a déjà une session active (page rechargée après traitement)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        return
      }

      setError('Le lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.')
    }

    initialize()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      if (error.message.includes('different from the old password'))
        setError('Le nouveau mot de passe doit être différent de l\'ancien.')
      else
        setError(error.message)
    } else {
      router.push('/mon-compte/profil')
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-accent-blue" />
        </div>

        <h1 className="text-2xl font-bold text-navy mb-2">Nouveau mot de passe</h1>
        <p className="text-gray-500 text-sm mb-8">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {!ready && !error && (
          <p className="text-sm text-gray-400">Vérification du lien en cours...</p>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
              Enregistrer le mot de passe
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ReinitialiserMotDePassePage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <Suspense fallback={<div className="max-w-md mx-auto px-6 py-20 text-center text-gray-400">Chargement...</div>}>
          <ReinitialiserContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
