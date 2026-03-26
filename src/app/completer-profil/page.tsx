'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { completeProfile } from '@/lib/actions/user'
import { SPECIALITES, MODES_EXERCICE, AVATARS, resolveSpecialite } from '@/lib/constants/profil'
import { Check } from 'lucide-react'

export default function CompleterProfilPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplir depuis les métadonnées PSC (given_name, family_name, specialite)
  useEffect(() => {
    if (!user?.user_metadata) return
    const meta = user.user_metadata
    if (meta.family_name && !nom) setNom(meta.family_name)
    if (meta.given_name && !prenom) setPrenom(meta.given_name)
    if (meta.specialite && !specialite) {
      const resolved = resolveSpecialite(meta.specialite)
      if (resolved && SPECIALITES.includes(resolved)) {
        setSpecialite(resolved)
      }
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = nom.trim() && prenom.trim() && specialite && modeExercice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)

    try {
      await completeProfile({
        nom: nom.trim(),
        prenom: prenom.trim(),
        specialite,
        mode_exercice: modeExercice,
        portrait: selectedAvatar || undefined,
      })
      router.push('/mon-compte/mes-evaluations')
    } catch (err) {
      console.error('Erreur complétion profil:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </main>
      </>
    )
  }

  if (!user) {
    router.push('/connexion')
    return null
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-navy mb-2">
              Complétez votre profil
            </h1>
            <p className="text-sm text-gray-500">
              Ces informations nous permettent de personnaliser votre expérience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom & Prénom */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-navy">Identité</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </div>

            {/* Exercice */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-navy">Exercice professionnel</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Spécialité *
                </label>
                <select
                  value={specialite}
                  onChange={(e) => setSpecialite(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white"
                >
                  <option value="">Sélectionnez votre spécialité</option>
                  {SPECIALITES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mode d&apos;exercice *
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODES_EXERCICE.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setModeExercice(mode)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        modeExercice === mode
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-navy">Choisissez votre avatar</h2>
              <p className="text-xs text-gray-500">
                Sélectionnez une image qui vous représentera sur la plateforme.
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative rounded-full overflow-hidden border-2 transition-all aspect-square ${
                      selectedAvatar === avatar.url
                        ? 'border-accent-blue ring-2 ring-accent-blue/30 scale-110'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.id} className="w-full h-full object-cover" />
                    {selectedAvatar === avatar.url && (
                      <div className="absolute inset-0 bg-accent-blue/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                className={!isValid || submitting ? 'opacity-50 pointer-events-none' : ''}
              >
                {submitting ? 'Enregistrement...' : 'Valider mon profil'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
