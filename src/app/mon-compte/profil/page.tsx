'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { updateProfile, cancelEmailChange } from '@/lib/actions/user'
import { SPECIALITES, MODES_EXERCICE, AVATARS, SM_SPECIALITES } from '@/lib/constants/profil'
import Button from '@/components/ui/Button'
import DeleteAccountModal from '@/components/mon-compte/DeleteAccountModal'
import { Check, Lock, Mail, Trash2 } from 'lucide-react'
import { useRef } from 'react'

export default function ProfilPage() {
  const { user } = useAuth()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [isFromPsc, setIsFromPsc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Email
  const [newEmail, setNewEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [cancellingEmail, setCancellingEmail] = useState(false)

  // Mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const supabaseRef = useRef(createClient())

  // Charger le profil existant
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('users')
      .select('nom, prenom, specialite, mode_exercice, portrait, rpps')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNom(data.nom || '')
          setPrenom(data.prenom || '')
          // Résoudre les codes SM vers libellés si nécessaire
          const sp = data.specialite || ''
          const resolved = SM_SPECIALITES[sp] ?? sp
          setSpecialite(SPECIALITES.includes(resolved) ? resolved : sp)
          setModeExercice(data.mode_exercice || '')
          setSelectedAvatar(data.portrait || null)
          setIsFromPsc(!!(data.rpps || user?.user_metadata?.provider === 'psc'))
        }
        setLoading(false)
      })
  }, [user])

  // Charger/vérifier le changement d'email en attente
  useEffect(() => {
    if (!user) return
    const key = `pendingEmail_${user.id}`
    const stored = localStorage.getItem(key)
    if (!stored) return
    // Si l'email actuel correspond déjà → confirmation faite, nettoyer
    if (user.email === stored) {
      localStorage.removeItem(key)
    } else {
      setPendingEmail(stored)
    }
  }, [user])

  const isValid = nom.trim() && prenom.trim() && specialite && modeExercice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await updateProfile({
        nom: nom.trim(),
        prenom: prenom.trim(),
        specialite,
        mode_exercice: modeExercice,
      })
      if (selectedAvatar) {
        const supabase = createClient()
        await supabase.from('users').update({ portrait: selectedAvatar }).eq('id', user!.id)
      }
      setSuccess('Profil mis à jour avec succès.')
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      console.error('Erreur mise à jour profil:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEmailChange = async () => {
    setCancellingEmail(true)
    try {
      await cancelEmailChange()
      localStorage.removeItem(`pendingEmail_${user!.id}`)
      setPendingEmail(null)
      setSuccess('Changement d\'email annulé.')
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      setTimeout(() => setSuccess(null), 4000)
    } catch {
      setError('Impossible d\'annuler le changement d\'email. Veuillez réessayer.')
    } finally {
      setCancellingEmail(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    setSuccess(null)
    setEmailSubmitting(true)
    const { error } = await supabaseRef.current.auth.updateUser({ email: newEmail })
    setEmailSubmitting(false)
    if (error) {
      setEmailError(error.message)
    } else {
      localStorage.setItem(`pendingEmail_${user!.id}`, newEmail)
      setPendingEmail(newEmail)
      setNewEmail('')
      setSuccess('Un email de confirmation a été envoyé à votre nouvelle adresse.')
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }

    setPasswordSubmitting(true)
    // Vérifier le mot de passe actuel en tentant une reconnexion
    const { error: signInError } = await supabaseRef.current.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordError('Mot de passe actuel incorrect.')
      setPasswordSubmitting(false)
      return
    }

    const { error } = await supabaseRef.current.auth.updateUser({ password: newPassword })
    setPasswordSubmitting(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Mot de passe mis à jour avec succès.')
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement du profil...</div>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-6">Mon compte</h1>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl mb-6 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6">{error}</div>
      )}

      {pendingEmail && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl mb-6 flex items-start gap-3">
          <Mail className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1">
            <p className="font-medium">Changement d&apos;email en attente</p>
            <p className="text-amber-700 mt-0.5">
              Un lien de confirmation a été envoyé à <span className="font-medium">{pendingEmail}</span>. En attendant, votre ancien email reste utilisé pour la connexion et toutes les communications.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelEmailChange}
            disabled={cancellingEmail}
            className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
          >
            {cancellingEmail ? 'Annulation...' : 'Annuler'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-navy">Identité</h2>
            {isFromPsc && (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-surface-light px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Fournie par Pro Santé Connect
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prénom *
              </label>
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
                readOnly={isFromPsc}
                onChange={(e) => !isFromPsc && setNom(e.target.value)}
                required
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none ${
                  isFromPsc
                    ? 'bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'
                }`}
                placeholder="Dupont"
              />
            </div>
          </div>
        </div>

        {/* Exercice professionnel */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Exercice professionnel</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Spécialité *
            </label>
            {isFromPsc ? (
              <input
                type="text"
                value={specialite}
                readOnly
                className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
              />
            ) : (
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
            )}
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
                  onClick={() => !isFromPsc && setModeExercice(mode)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    modeExercice === mode
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                  } ${isFromPsc ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Changer l'email */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Adresse email</h2>
          <p className="text-xs text-gray-500">Email actuel : <span className="font-medium text-navy">{user?.email}</span></p>
          <form onSubmit={handleEmailChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nouvel email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="nouveau@email.com"
              />
            </div>
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            <div className="flex justify-end">
              <Button variant="primary" className={emailSubmitting ? 'opacity-50 pointer-events-none' : ''}>
                {emailSubmitting ? 'Envoi...' : 'Changer l\'email'}
              </Button>
            </div>
          </form>
        </div>

        {/* Changer le mot de passe */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Mot de passe</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="6 caractères minimum"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="6 caractères minimum"
              />
            </div>
            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            <div className="flex justify-end">
              <Button variant="primary" className={passwordSubmitting ? 'opacity-50 pointer-events-none' : ''}>
                {passwordSubmitting ? 'Mise à jour...' : 'Changer le mot de passe'}
              </Button>
            </div>
          </form>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Mon avatar</h2>
          <p className="text-xs text-gray-500">
            Sélectionnez une image qui vous représente sur la plateforme.
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

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            className={!isValid || submitting ? 'opacity-50 pointer-events-none' : ''}
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>

      {/* Zone de danger */}
      <div className="mt-8 border border-red-200 rounded-card p-5">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Zone de danger</h2>
        <p className="text-xs text-gray-500 mb-4">
          La suppression de votre compte est définitive et irréversible.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 px-4 py-2 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer mon compte
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}
