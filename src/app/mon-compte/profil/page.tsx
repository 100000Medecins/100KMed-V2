'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { updateProfile, cancelEmailChange } from '@/lib/actions/user'
import { SPECIALITES, MODES_EXERCICE, AVATARS, SM_SPECIALITES } from '@/lib/constants/profil'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import DeleteAccountModal from '@/components/mon-compte/DeleteAccountModal'
import { Check, Lock, Mail, Trash2, KeyRound } from 'lucide-react'
import { useRef } from 'react'

export default function ProfilPage() {
  const { user, resetPassword } = useAuth()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [isFromPsc, setIsFromPsc] = useState(false)
  const [contactEmail, setContactEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [initPassword, setInitPassword] = useState('')
  const [initPasswordSubmitting, setInitPasswordSubmitting] = useState(false)
  const [initPasswordError, setInitPasswordError] = useState<string | null>(null)

  // Email
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [cancellingEmail, setCancellingEmail] = useState(false)

  // Mot de passe
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const currentPasswordRef = useRef<HTMLInputElement>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const supabaseRef = useRef(createClient())

  // Charger le profil existant
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('users')
      .select('nom, prenom, specialite, mode_exercice, portrait, rpps, contact_email')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNom(data.nom || '')
          setPrenom(data.prenom || '')
          setContactEmail((data as { contact_email?: string }).contact_email || null)
          // Résoudre les codes SM vers libellés si nécessaire
          const sp = data.specialite || ''
          const resolved = SM_SPECIALITES[sp] ?? sp
          setSpecialite(SPECIALITES.includes(resolved) ? resolved : sp)
          setModeExercice(data.mode_exercice || '')
          setSelectedAvatar(data.portrait || null)
          const fromPsc = !!(data.rpps || user?.user_metadata?.provider === 'psc')
          setIsFromPsc(fromPsc)
          // Utilisateur PSC sans mot de passe = aucune identité "email" dans Supabase
          if (fromPsc) {
            const hasEmailIdentity = user?.identities?.some(
              (i: { provider: string }) => i.provider === 'email'
            )
            setNeedsPassword(!hasEmailIdentity)
          }
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

  const handleInitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (initPassword.length < 6) {
      setInitPasswordError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setInitPasswordError(null)
    setInitPasswordSubmitting(true)
    const { error } = await supabaseRef.current.auth.updateUser({ password: initPassword })
    setInitPasswordSubmitting(false)
    if (error) {
      setInitPasswordError(error.message)
    } else {
      setNeedsPassword(false)
      setInitPassword('')
      setSuccess('Mot de passe défini avec succès. Vous pouvez maintenant vous connecter par email.')
      document.documentElement.scrollTop = 0
      setTimeout(() => setSuccess(null), 5000)
    }
  }

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
      setShowEmailForm(false)
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

    const currentPasswordValue = currentPasswordRef.current?.value || ''
    if (!currentPasswordValue) {
      setPasswordError('Veuillez saisir votre mot de passe actuel.')
      return
    }

    setPasswordSubmitting(true)
    // Vérifier le mot de passe actuel en tentant une reconnexion
    const { error: signInError } = await supabaseRef.current.auth.signInWithPassword({
      email: user!.email!,
      password: currentPasswordValue,
    })
    if (signInError) {
      setPasswordError('Mot de passe actuel incorrect.')
      setPasswordSubmitting(false)
      return
    }

    const { error } = await supabaseRef.current.auth.updateUser({ password: newPassword })
    setPasswordSubmitting(false)
    if (error) {
      if (error.message.includes('different from the old password'))
        setPasswordError('Le nouveau mot de passe doit être différent de l\'ancien.')
      else
        setPasswordError(error.message)
    } else {
      if (currentPasswordRef.current) currentPasswordRef.current.value = ''
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
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

      {/* Bannière définition de mot de passe — PSC sans password */}
      {needsPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">Définissez un mot de passe</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Vous vous êtes connecté via Pro Santé Connect. Pour pouvoir vous reconnecter par email à l&apos;avenir, définissez un mot de passe dès maintenant.
              </p>
            </div>
          </div>
          <form onSubmit={handleInitPassword} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-amber-800 mb-1">
                Choisissez un mot de passe <span className="text-amber-500">(6 caractères min.)</span>
              </label>
              <PasswordInput
                value={initPassword}
                onChange={(e) => setInitPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={initPasswordSubmitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors shrink-0"
            >
              {initPasswordSubmitting ? 'Enregistrement...' : 'Définir'}
            </button>
          </form>
          {initPasswordError && (
            <p className="text-xs text-red-600 mt-2">{initPasswordError}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité professionnelle (fusionné) */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-navy">Identité professionnelle</h2>
            {isFromPsc && (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-surface-light px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Fourni par Pro Santé Connect
              </span>
            )}
          </div>

          {isFromPsc ? (
            /* Champs grisés en lecture seule pour les utilisateurs PSC */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prenom && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}
              {nom && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={nom}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}
              {specialite && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Spécialité</label>
                  <input
                    type="text"
                    value={specialite}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}
              {modeExercice && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mode d&apos;exercice</label>
                  <input
                    type="text"
                    value={modeExercice}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}
              {/* Email PSC technique, affiché uniquement s'il diffère du contact_email */}
              {user?.email && contactEmail && user.email !== contactEmail && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email Pro Santé Connect</label>
                  <input
                    type="text"
                    value={user.email}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-surface-light text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Formulaire éditable pour les non-PSC */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Spécialité *</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mode d&apos;exercice *</label>
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

            </>
          )}
        </div>

        {/* Identifiants de connexion */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Identifiants de connexion</h2>

          {/* Email */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Email : <span className="font-semibold text-navy">{contactEmail || user?.email}</span>
              </p>
              {!showEmailForm && (
                <button
                  type="button"
                  onClick={() => { setShowEmailForm(true); setEmailError(null) }}
                  className="shrink-0 text-xs font-medium text-accent-blue hover:underline"
                >
                  Changer
                </button>
              )}
            </div>
            {showEmailForm && (
              <form onSubmit={handleEmailChange} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nouvel email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                    placeholder="nouveau@email.com"
                  />
                </div>
                {emailError && <p className="text-xs text-red-600">{emailError}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailError(null) }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Annuler
                  </button>
                  <Button variant="primary" className={emailSubmitting ? 'opacity-50 pointer-events-none' : ''}>
                    {emailSubmitting ? 'Envoi...' : 'Confirmer'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Mot de passe */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Mot de passe : <span className="font-semibold text-navy tracking-widest">••••••••</span>
              </p>
              {!showPasswordForm && (
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(true); setPasswordError(null) }}
                  className="shrink-0 text-xs font-medium text-accent-blue hover:underline"
                >
                  Changer
                </button>
              )}
            </div>
            {showPasswordForm && (
              isFromPsc ? (
                /* Utilisateurs PSC : pas d'ancien mot de passe → envoyer un lien de réinitialisation */
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Vous vous êtes connecté via Pro Santé Connect. Pour définir ou modifier votre mot de passe, nous vous envoyons un lien par email.
                  </p>
                  {resetSent ? (
                    <p className="text-xs text-green-600">
                      Email envoyé à <span className="font-medium">{contactEmail || user?.email}</span>. Vérifiez votre boîte mail.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const email = contactEmail || user?.email
                          if (!email) return
                          await resetPassword(email)
                          setResetSent(true)
                          setTimeout(() => setResetSent(false), 10000)
                        }}
                        className="text-xs font-semibold text-white bg-accent-blue hover:bg-accent-blue/90 px-4 py-2 rounded-xl transition-colors"
                      >
                        Envoyer le lien de réinitialisation
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowPasswordForm(false); setResetSent(false) }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {resetSent && (
                    <button
                      type="button"
                      onClick={() => { setShowPasswordForm(false); setResetSent(false) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Fermer
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
                    <input
                      ref={currentPasswordRef}
                      type="password"
                      autoComplete="current-password"
                      required
                      autoFocus
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      placeholder="••••••••"
                    />
                    {resetSent ? (
                      <p className="text-xs text-green-600 mt-1.5">
                        Email de réinitialisation envoyé à <span className="font-medium">{contactEmail || user?.email}</span>.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const email = contactEmail || user?.email
                          if (!email) return
                          await resetPassword(email)
                          setResetSent(true)
                          setTimeout(() => setResetSent(false), 10000)
                        }}
                        className="text-xs text-gray-400 hover:text-accent-blue hover:underline mt-1.5 block"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      placeholder="6 caractères minimum"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      placeholder="6 caractères minimum"
                    />
                  </div>
                  {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(null); setResetSent(false) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Annuler
                    </button>
                    <Button variant="primary" className={passwordSubmitting ? 'opacity-50 pointer-events-none' : ''}>
                      {passwordSubmitting ? 'Mise à jour...' : 'Confirmer'}
                    </Button>
                  </div>
                </form>
              )
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-navy">Mon avatar</h2>

          {selectedAvatar && !showAvatarPicker ? (
            /* Avatar sélectionné — affichage compact */
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-accent-blue ring-2 ring-accent-blue/30 hover:opacity-80 transition-opacity"
                title="Changer d'avatar"
              >
                <img src={selectedAvatar} alt="Mon avatar" className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="text-xs font-medium text-accent-blue hover:underline ml-2"
              >
                Changer
              </button>
            </div>
          ) : (
            /* Grille de sélection */
            <>
              {!selectedAvatar && (
                <p className="text-xs text-gray-500">Sélectionnez une image qui vous représente sur la plateforme.</p>
              )}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => { setSelectedAvatar(avatar.url); setShowAvatarPicker(false) }}
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
              {showAvatarPicker && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </>
          )}
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
