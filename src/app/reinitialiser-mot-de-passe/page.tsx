'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck } from 'lucide-react'

const MSG_EXPIRE = 'Le lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.'

function ReinitialiserContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  // On stocke l'access token pour appeler l'API REST directement (bypass lock Supabase)
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const STORAGE_KEY = 'reset_access_token'

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (session?.access_token) {
          accessTokenRef.current = session.access_token
          sessionStorage.setItem(STORAGE_KEY, session.access_token)
        }
        setReady(true)
      }
    })

    async function initialize() {
      // Flux PKCE : ?code=
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) setError(MSG_EXPIRE)
        else if (data.session?.access_token) {
          accessTokenRef.current = data.session.access_token
          sessionStorage.setItem(STORAGE_KEY, data.session.access_token)
        }
        return
      }

      // Flux implicite : #access_token=...&type=recovery
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (accessToken && refreshToken && type === 'recovery') {
          accessTokenRef.current = accessToken
          sessionStorage.setItem(STORAGE_KEY, accessToken)
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (error) setError(MSG_EXPIRE)
          return
        }
      }

      // Token sauvegardé (survit au Fast Refresh)
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        accessTokenRef.current = stored
        setReady(true)
        return
      }

      // Session déjà active
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        accessTokenRef.current = session.access_token
        sessionStorage.setItem(STORAGE_KEY, session.access_token)
        setReady(true)
      } else {
        setError(MSG_EXPIRE)
      }
    }

    initialize()

    const handleUnload = () => { if (!done) supabase.auth.signOut() }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [done])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    const token = accessTokenRef.current || sessionStorage.getItem('reset_access_token')
    if (!token) {
      setError(MSG_EXPIRE)
      return
    }

    setSubmitting(true)
    try {
      // Appel direct à l'API REST Supabase — bypass le lock interne du SDK
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.msg || body?.message || body?.error_description || ''
        if (msg.includes('different from the old password'))
          setError('Le nouveau mot de passe doit être différent de l\'ancien.')
        else
          setError('Erreur lors de la mise à jour. Demandez un nouveau lien.')
      } else {
        setDone(true)
        sessionStorage.removeItem('reset_access_token')
        window.location.href = '/mon-compte/profil'
      }
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
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
              {submitting ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
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
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-navy flex items-center justify-center z-50">
        <Link href="/">
          <span className="text-white font-bold text-lg">100 000 médecins</span>
        </Link>
      </header>
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <Suspense fallback={<div className="max-w-md mx-auto px-6 py-20 text-center text-gray-400">Chargement...</div>}>
          <ReinitialiserContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
