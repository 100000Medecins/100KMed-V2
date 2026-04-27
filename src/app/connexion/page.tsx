'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { ShieldCheck, Mail } from 'lucide-react'
import PasswordInput from '@/components/ui/PasswordInput'
import { checkEmailExists } from '@/lib/actions/user'

function ConnexionContent() {
  const { signInWithPSC, signInWithEmail, resetPassword } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect')
  const errorParam = searchParams.get('error')
  const modeParam = searchParams.get('mode')
  const emailParam = searchParams.get('email')

  const [mode, setMode] = useState<'choice' | 'login' | 'forgot'>(
    modeParam === 'login' || emailParam ? 'login' : 'choice'
  )
  const [email, setEmail] = useState(emailParam ?? '')
  const [password, setPassword] = useState('')
  const resetSuccess = searchParams.get('reset') === 'success'
  const PSC_ERROR_MESSAGES: Record<string, string> = {
    psc_non_medecin: 'Ce compte Pro Santé Connect n\'est pas celui d\'un médecin. 100 000 Médecins est réservé aux médecins.',
    psc_auth_error: 'La connexion via Pro Santé Connect a échoué. Veuillez réessayer.',
    psc_no_identity: 'Impossible d\'identifier votre compte PSC. Veuillez réessayer.',
    psc_create_error: 'Impossible de créer votre compte. Contactez le support.',
    psc_session_error: 'Erreur lors de l\'établissement de la session. Veuillez réessayer.',
  }
  const [error, setError] = useState<string | null>(
    errorParam ? (PSC_ERROR_MESSAGES[errorParam] ?? 'Une erreur est survenue lors de la connexion.') : null
  )
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(resetSuccess ? 'Mot de passe mis à jour. Vous pouvez vous connecter.' : null)

  // ?mode=register → rediriger vers /inscription
  useEffect(() => {
    if (modeParam === 'register') router.replace('/inscription')
  }, [modeParam, router])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    if (mode === 'forgot') {
      const result = await resetPassword(email)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.')
      }
      setSubmitting(false)
      return
    }

    // mode === 'login' : vérifier si l'email existe avant de tenter la connexion
    const exists = await checkEmailExists(email)
    if (!exists) {
      window.location.href = `/inscription?email=${encodeURIComponent(email)}&from=login`
      return
    }

    const result = await signInWithEmail(email, password)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      window.location.href = redirect || '/mon-compte/profil'
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-accent-blue" />
        </div>

        <h1 className="text-2xl font-bold text-navy mb-2">Connexion</h1>
        <p className="text-gray-500 text-sm mb-8">
          Connectez-vous pour accéder à votre espace.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl mb-6">
            {success}
          </div>
        )}

        {mode === 'choice' && (
          <div className="space-y-3">
            <button
              onClick={signInWithPSC}
              className="w-full flex justify-center"
            >
              <img
                src="/logos/ProSanteConnect_sidentifier_COULEURS.svg"
                alt="S'identifier avec Pro Santé Connect"
                className="h-14 w-auto"
              />
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={() => setMode('login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-navy hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Se connecter avec un email
            </button>

            <button
              onClick={() => router.push('/inscription')}
              className="w-full text-sm text-accent-blue hover:underline mt-2"
            >
              Créer un compte
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
            <p className="text-sm text-gray-500 text-center">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="votre@email.com"
              />
            </div>
            <Button
              variant="primary"
              className={`w-full justify-center ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              Envoyer le lien
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Mot de passe</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="6 caractères minimum"
              />
            </div>

            <Button
              variant="primary"
              className={`w-full justify-center ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              Se connecter
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => { setMode('choice'); setError(null); setSuccess(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => router.push(email ? `/inscription?email=${encodeURIComponent(email)}` : '/inscription')}
                className="text-accent-blue hover:underline"
              >
                Créer un compte
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setSuccess(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-400 mt-6">
          En vous connectant, vous acceptez nos{' '}
          <a href="/cgu" className="text-accent-blue hover:underline">CGU</a>
          {' '}et notre{' '}
          <a href="/rgpd" className="text-accent-blue hover:underline">politique de confidentialité</a>.
        </p>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <Suspense
          fallback={
            <div className="max-w-md mx-auto px-6 py-20">
              <div className="bg-white rounded-card shadow-card p-8 text-center animate-pulse">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 mb-6" />
                <div className="h-6 bg-gray-100 rounded w-32 mx-auto mb-8" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
          }
        >
          <ConnexionContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
