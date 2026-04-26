'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getFusionDetails, mergeAccounts } from '@/lib/actions/merge'
import type { FusionAccount } from '@/lib/actions/merge'
import { ShieldCheck } from 'lucide-react'

export default function FusionnerComptePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [accounts, setAccounts] = useState<{ source: FusionAccount; target: FusionAccount } | null>(null)
  const [loading, setLoading] = useState(true)
  const [keepId, setKeepId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    getFusionDetails(token).then((data) => {
      setAccounts(data)
      setLoading(false)
    })
  }, [token])

  const handleMerge = async () => {
    if (!keepId) return
    setSubmitting(true)
    setError(null)
    const result = await mergeAccounts(token, keepId)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error || 'Une erreur est survenue.')
    } else if (result.redirectUrl) {
      window.location.href = result.redirectUrl
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </main>
        <Footer />
      </>
    )
  }

  if (!accounts) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center py-16">
            <p className="text-red-600 font-medium mb-2">Lien de fusion invalide ou expiré.</p>
            <p className="text-sm text-gray-500 mb-6">Ce lien n'est valable que 15 minutes. Recommencez depuis votre compte.</p>
            <a href="/mon-compte/profil" className="text-accent-blue hover:underline text-sm font-medium">
              Retour à mon compte
            </a>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const displayedAccounts = [accounts.source, accounts.target]

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-navy">Fusionner vos comptes</h1>
              <p className="text-xs text-gray-500">Deux comptes sont associés à votre RPPS</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8 text-sm text-amber-800 leading-relaxed">
            Nous avons trouvé deux comptes distincts liés à votre numéro RPPS. Choisissez l&apos;adresse email que vous souhaitez conserver pour vous connecter à l&apos;avenir.
          </div>

          <div className="space-y-4 mb-8">
            {displayedAccounts.map((account) => {
              const displayEmail = account.contact_email || account.email || '(email non défini)'
              const isSelected = keepId === account.id
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setKeepId(account.id)}
                  className={`w-full text-left p-5 rounded-card border-2 transition-all ${
                    isSelected
                      ? 'border-accent-blue bg-accent-blue/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-navy text-sm">{displayEmail}</p>
                      {(account.prenom || account.nom) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[account.prenom, account.nom].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {account.rpps && (
                        <p className="text-xs text-gray-400 mt-0.5">RPPS : {account.rpps}</p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-accent-blue bg-accent-blue' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-4">{error}</div>
          )}

          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Toutes vos évaluations, favoris et données seront regroupés sur le compte conservé. L&apos;autre compte sera définitivement supprimé.
          </p>

          <button
            type="button"
            onClick={handleMerge}
            disabled={!keepId || submitting}
            className="w-full py-3 px-6 bg-navy text-white font-semibold rounded-xl disabled:opacity-40 hover:bg-navy/90 transition-colors"
          >
            {submitting ? 'Fusion en cours...' : 'Fusionner les comptes'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  )
}
