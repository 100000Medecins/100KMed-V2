'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { completeProfile, getCurrentUserProfile } from '@/lib/actions/user'
import { AVATARS } from '@/lib/constants/profil'
import { Check, Lock } from 'lucide-react'

export default function CompleterProfilPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Champs PSC — non modifiables
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')

  // Champs à compléter
  const [contactEmail, setContactEmail] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFromPsc, setIsFromPsc] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!user) return

    async function loadProfile() {
      const profile = await getCurrentUserProfile()

      // Champs PSC grisés si RPPS renseigné (connexion PSC, ancienne ou nouvelle)
      const hasPsc = !!(profile?.rpps || user?.user_metadata?.provider === 'psc')
      setIsFromPsc(hasPsc)

      // Priorité : table users > user_metadata PSC
      setNom(profile?.nom || String(user?.user_metadata?.family_name || ''))
      setPrenom(profile?.prenom || String(user?.user_metadata?.given_name || ''))
      setSpecialite(profile?.specialite || String(user?.user_metadata?.specialite || ''))
      setModeExercice(profile?.mode_exercice || String(user?.user_metadata?.mode_exercice || ''))
      if (profile?.pseudo) setPseudo(profile.pseudo)
      if (profile?.contact_email) setContactEmail(profile.contact_email)
      if (profile?.portrait) setSelectedAvatar(profile.portrait)

      setProfileLoaded(true)
    }

    loadProfile()
  }, [user])

  const isValid = nom.trim() && prenom.trim() && specialite && modeExercice && contactEmail.trim()

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
        contact_email: contactEmail.trim(),
        pseudo: pseudo.trim() || undefined,
        portrait: selectedAvatar || undefined,
      })
      router.push('/mon-compte')
    } catch (err) {
      console.error('Erreur complétion profil:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !profileLoaded) {
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
            <h1 className="text-2xl font-bold text-navy mb-2">Bienvenue sur 100&nbsp;000 Médecins</h1>
            <p className="text-sm text-gray-500">
              Vérifiez vos informations et complétez votre profil pour continuer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Identité — champs PSC non modifiables */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-navy">Identité professionnelle</h2>
                {isFromPsc && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-surface-light px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    Fournie par Pro Santé Connect
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    readOnly={isFromPsc}
                    onChange={(e) => !isFromPsc && setPrenom(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                      isFromPsc
                        ? 'bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={nom}
                    readOnly={isFromPsc}
                    onChange={(e) => !isFromPsc && setNom(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                      isFromPsc
                        ? 'bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                    }`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Spécialité</label>
                  <input
                    type="text"
                    value={specialite}
                    readOnly={isFromPsc}
                    onChange={(e) => !isFromPsc && setSpecialite(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                      isFromPsc
                        ? 'bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mode d&apos;exercice</label>
                  <input
                    type="text"
                    value={modeExercice}
                    readOnly={isFromPsc}
                    onChange={(e) => !isFromPsc && setModeExercice(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                      isFromPsc
                        ? 'bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Email — obligatoire */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-navy">Coordonnées</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email de contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  placeholder="votre@email.fr"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Utilisé pour les notifications et la récupération de compte.
                </p>
              </div>

              {/* Pseudo — optionnel */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pseudo <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder={prenom ? `${prenom} ${nom.charAt(0)}.` : 'Ex : Dr Martin'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Affiché à la place de votre nom sur vos avis. Si vide, nous utiliserons &laquo;&nbsp;{prenom || 'Prénom'} {nom.charAt(0) || 'N'}.&nbsp;&raquo;
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            {/* Avatar — optionnel */}
            <div className="bg-white rounded-card shadow-card p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-navy">Avatar <span className="text-gray-400 font-normal text-xs">(optionnel)</span></h2>
                <p className="text-xs text-gray-500 mt-1">
                  Image affichée à côté de vos avis.
                </p>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(selectedAvatar === avatar.url ? null : avatar.url)}
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

            <div className="flex justify-end">
              <Button
                variant="primary"
                className={!isValid || submitting ? 'opacity-50 pointer-events-none' : ''}
              >
                {submitting ? 'Enregistrement...' : 'Accéder à mon compte'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
