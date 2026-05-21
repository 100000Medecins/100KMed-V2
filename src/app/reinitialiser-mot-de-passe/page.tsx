import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import { verifyResetToken } from '@/lib/email/reset-token'
import ResetPasswordForm from './ResetPasswordForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ uid?: string; iat?: string; token?: string }>
}

export default async function ReinitialiserMotDePassePage({ searchParams }: PageProps) {
  const { uid, iat, token } = await searchParams
  const verdict = uid && iat && token
    ? verifyResetToken(uid, Number(iat), token)
    : 'invalid'

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-navy flex items-center justify-center z-50">
        <Link href="/">
          <span className="text-white font-bold text-lg">100 000 médecins</span>
        </Link>
      </header>
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-md mx-auto px-6 py-20">
          <div className="bg-white rounded-card shadow-card p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-accent-blue" />
            </div>

            <h1 className="text-2xl font-bold text-navy mb-2">Nouveau mot de passe</h1>

            {verdict === 'ok' ? (
              <>
                <p className="text-gray-500 text-sm mb-8">
                  Choisissez un nouveau mot de passe pour votre compte.
                </p>
                <ResetPasswordForm uid={uid!} iat={Number(iat)} token={token!} />
              </>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-6">
                  {verdict === 'expired'
                    ? 'Ce lien de réinitialisation a expiré (valable 1 heure).'
                    : 'Ce lien de réinitialisation est invalide.'}
                </p>
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6">
                  Demandez un nouveau lien de réinitialisation depuis la page de connexion.
                </div>
                <Link
                  href="/connexion"
                  className="inline-block w-full py-3 px-6 bg-navy text-white font-semibold rounded-xl hover:bg-navy/90 transition-colors"
                >
                  Retour à la connexion
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
