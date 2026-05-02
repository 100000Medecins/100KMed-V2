import Link from 'next/link'
import { BellOff, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Désabonnement confirmé — 100 000 Médecins' }

export default function DesabonnementConfirmePage({
  searchParams,
}: {
  searchParams: { erreur?: string }
}) {
  const erreur = searchParams.erreur

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-light flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 text-center">
          {erreur ? (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-navy mb-3">Lien invalide</h1>
              <p className="text-gray-600 leading-relaxed mb-8">
                Ce lien de désabonnement est invalide ou a déjà été utilisé. Connectez-vous à votre compte pour gérer vos préférences de notification.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <BellOff className="w-8 h-8 text-navy" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-navy mb-3">Désabonnement pris en compte</h1>
              <p className="text-gray-600 leading-relaxed mb-2">
                Vous ne recevrez plus d&apos;emails de relance ni de communications marketing de notre part.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Les emails transactionnels (confirmation d&apos;inscription, réinitialisation de mot de passe) restent actifs.
              </p>
            </>
          )}
          <div className="flex flex-col gap-3">
            <Link
              href="/connexion"
              className="block w-full py-3 px-6 rounded-xl bg-navy text-white font-semibold text-sm text-center hover:bg-navy/85 transition-colors"
            >
              Gérer mes préférences
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-6 rounded-xl bg-surface-light text-navy font-medium text-sm text-center hover:bg-gray-100 transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
