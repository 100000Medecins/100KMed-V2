import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Avis confirmé — 100 000 Médecins' }

export default function AvisConfirmePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-light flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-3">Merci !</h1>
          <p className="text-gray-600 leading-relaxed mb-2">
            Votre avis a bien été confirmé. Il reste actif et contribue à aider vos confrères dans le choix de leurs logiciels médicaux.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Vous recevrez une nouvelle demande dans un an si votre évaluation est toujours d&apos;actualité.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/solutions"
              className="block w-full py-3 px-6 rounded-xl bg-navy text-white font-semibold text-sm text-center hover:bg-navy/85 transition-colors"
            >
              Découvrir les solutions médicales
            </Link>
            <Link
              href="/connexion"
              className="block w-full py-3 px-6 rounded-xl bg-surface-light text-navy font-medium text-sm text-center hover:bg-gray-100 transition-colors"
            >
              Se connecter à mon compte
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
