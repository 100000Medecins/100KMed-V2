'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { UserPlus, Mail } from 'lucide-react'
import PasswordInput from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'

function InscriptionContent() {
  const { signInWithPSC, signUpWithEmail, signInWithEmail } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailParam = searchParams.get('email')
  const fromLogin = searchParams.get('from') === 'login'

  const [email, setEmail] = useState(emailParam ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const result = await signUpWithEmail(email, password)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else if (result.redirectTo) {
      // Session immédiate (confirmation email désactivée) → redirection directe
      window.location.href = result.redirectTo
    } else {
      // Confirmation email requise → afficher le message
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
          <UserPlus className="w-8 h-8 text-accent-blue" />
        </div>

        <h1 className="text-2xl font-bold text-navy mb-2">Créer un compte</h1>

        {fromLogin ? (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 mb-6">
            Aucun compte trouvé pour cet email. Souhaitez-vous vous inscrire ?
          </p>
        ) : (
          <p className="text-gray-500 text-sm mb-8">
            Inscrivez-vous pour accéder à votre espace.
          </p>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl mb-6 space-y-3">
            <p>{success}</p>
            <div className="border-t border-green-200 pt-3">
              {resendSent ? (
                <p className="text-xs text-green-600">Email renvoyé. Vérifiez aussi vos spams.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-green-700">Vous n&apos;avez pas reçu l&apos;email ?</p>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={async () => {
                      setResending(true)
                      const supabase = createClient()
                      await supabase.auth.resend({
                        type: 'signup',
                        email,
                        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
                      })
                      setResending(false)
                      setResendSent(true)
                    }}
                    className="text-xs font-semibold text-green-700 underline hover:text-green-900 disabled:opacity-50"
                  >
                    {resending ? 'Envoi...' : 'Renvoyer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!success && (
          <>
            <div className="space-y-3 mb-6">
              <button
                onClick={signInWithPSC}
                className="w-full flex justify-center"
              >
                <img
                  src="/logos/ProSanteConnect_sidentifier_COULEURS.svg"
                  alt="S'inscrire avec Pro Santé Connect"
                  className="h-14 w-auto"
                />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Mail className="w-3.5 h-3.5" />
                Inscription avec un email
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
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

              {error?.startsWith('Un compte existe déjà') ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true)
                    const result = await signInWithEmail(email, password)
                    if (result.error) {
                      setError(result.error)
                      setSubmitting(false)
                    } else {
                      window.location.href = '/mon-compte/profil'
                    }
                  }}
                  className="w-full py-3 px-6 bg-navy text-white font-semibold rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Connexion…' : 'Se connecter'}
                </button>
              ) : (
                <Button
                  variant="primary"
                  className={`w-full justify-center ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  Créer mon compte
                </Button>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/connexion')}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                >
                  Déjà inscrit ? Se connecter
                </button>
              </div>
            </form>
          </>
        )}

        <p className="text-xs text-gray-400 mt-6">
          En vous inscrivant, vous acceptez nos{' '}
          <a href="/cgu" className="text-accent-blue hover:underline">CGU</a>
          {' '}et notre{' '}
          <a href="/rgpd" className="text-accent-blue hover:underline">politique de confidentialité</a>.
        </p>
      </div>
    </div>
  )
}

export default function InscriptionPage() {
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
          <InscriptionContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
