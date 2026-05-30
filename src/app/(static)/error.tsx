'use client'

import { useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { AlertCircle, RotateCw } from 'lucide-react'

export default function StaticPagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log côté client : visible dans la console navigateur + remonte aux outils
    // de monitoring (Vercel logs côté serveur sont déjà capturés par Next.js).
    console.error('[static page error]', error)
  }, [error])

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-amber-100 items-center justify-center text-amber-600 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-navy mb-2">
            Contenu temporairement indisponible
          </h1>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Une erreur est survenue en chargeant cette page. Notre équipe en a
            été notifiée. Vous pouvez réessayer ou revenir plus tard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              leftIcon={<RotateCw className="w-4 h-4" />}
              onClick={() => reset()}
            >
              Réessayer
            </Button>
            <Button variant="outline" href="/">
              Retour à l&apos;accueil
            </Button>
          </div>
          {error.digest && (
            <p className="text-[10px] text-gray-300 mt-8 font-mono">
              ref : {error.digest}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
