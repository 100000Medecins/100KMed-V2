'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { useAuth } from '@/components/providers/AuthProvider'
import { completeProfile, getCurrentUserProfile } from '@/lib/actions/user'
import { AVATARS } from '@/lib/constants/profil'
import { createClient } from '@/lib/supabase/client'
import { Check, Lock } from 'lucide-react'

export default function CompleterProfilPage() {
  const { user, loading: authLoading } = useAuth()

  // Champs PSC — non modifiables
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')

  // Champs à compléter
  const [contactEmail, setContactEmail] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)

  const [password, setPassword] = useState('')
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
      if (profile?.portrait) setSelectedAvatar(profile.portrait)

      // Pré-remplir l'email : priorité contact_email déjà sauvé,
      // sinon email_temp de l'évaluation anonyme (email renseigné par l'utilisateur),
      // sinon user.email en dernier recours (peut être une adresse technique PSC)
      if (profile?.contact_email) {
        setContactEmail(profile.contact_email)
      } else {
        // Chercher l'email_temp dans l'évaluation anonyme liée à ce compte
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: evalAnon } = await (supabase as any)
          .from('evaluations')
          .select('email_temp')
          .eq('user_id', user!.id)
          .not('email_temp', 'is', null)
          .limit(1)
          .single()
        if (evalAnon?.email_temp) {
          setContactEmail(evalAnon.email_temp)
        } else if (user?.email && !user.email.includes('@psc.sante.fr')) {
          setContactEmail(user.email)
        }
      }

      setProfileLoaded(true)
    }

    loadProfile()
  }, [user])

  const isValid = nom.trim() && prenom.trim() && specialite && modeExercice && contactEmail.trim() && (!isFromPsc || password.length >= 6)

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
        password: isFromPsc ? password : undefined,
      })
      // Re-auth uniquement pour PSC : updateUserById (email + mdp) invalide la session client.
      // Pour les utilisateurs email/mdp, aucun updateUserById n'est appelé → session conservée.
      if (isFromPsc) {
        const supabase = createClient()
        await supabase.auth.signInWithPassword({
          email: contactEmail.trim(),
          password,
        })
      }
      window.location.href = '/mon-compte/profil'
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
    window.location.replace('/connexion')
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
                  onChange={isFromPsc ? (e) => setContactEmail(e.target.value) : undefined}
                  readOnly={!isFromPsc}
                  required
                  placeholder="votre@email.fr"
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                    isFromPsc
                      ? 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                      : 'border-gray-100 bg-surface-light text-gray-500 cursor-not-allowed'
                  }`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isFromPsc
                    ? 'Utilisé pour les notifications et la récupération de compte.'
                    : 'Adresse confirmée — utilisée pour les notifications et la récupération de compte.'}
                </p>
              </div>

              {/* Mot de passe — uniquement pour les utilisateurs PSC (pas encore de mot de passe) */}
              {isFromPsc && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="6 caractères minimum"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Vous permettra de vous reconnecter par email en plus de Pro Santé Connect.
                  </p>
                </div>
              )}

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
