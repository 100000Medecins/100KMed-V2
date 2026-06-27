'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { completeProfile, getCurrentUserProfile, getEditeurClaimOptions, createEditeurClaim, signalerErreurIdentite } from '@/lib/actions/user'
import type { EditeurClaimOption } from '@/lib/actions/user'
import { SPECIALITES, MODES_EXERCICE } from '@/lib/constants/profil'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { Lock, Mail, AlertCircle } from 'lucide-react'

const LIBRE_TEXTE_VALUE = '__libre_texte__'

export default function CompleterProfilPage() {
  const { user, loading: authLoading } = useAuth()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')

  const [contactEmail, setContactEmail] = useState('')

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Signalement d'erreur sur l'identité PSC (lecture seule)
  const [showErrModal, setShowErrModal] = useState(false)
  const [errChamp, setErrChamp] = useState('Spécialité')
  const [errMessage, setErrMessage] = useState('')
  const [errEmail, setErrEmail] = useState('')
  const [errSubmitting, setErrSubmitting] = useState(false)
  const [errSent, setErrSent] = useState(false)
  const [errError, setErrError] = useState<string | null>(null)

  const openErrModal = () => {
    setErrEmail(contactEmail)
    setErrMessage('')
    setErrSent(false)
    setErrError(null)
    setShowErrModal(true)
  }

  const submitErrSignalement = async () => {
    setErrSubmitting(true)
    setErrError(null)
    try {
      const res = await signalerErreurIdentite({ champ: errChamp, message: errMessage.trim(), email: errEmail.trim() })
      if (res.ok) setErrSent(true)
      else setErrError(res.error)
    } finally {
      setErrSubmitting(false)
    }
  }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fusionEmailSent, setFusionEmailSent] = useState<string | null>(null)
  const [isFromPsc, setIsFromPsc] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Éditeur claim
  const [claimOptions, setClaimOptions] = useState<EditeurClaimOption[]>([])
  const [claimValue, setClaimValue] = useState('')
  const [libreTexte, setLibreTexte] = useState('')
  const [roleMessage, setRoleMessage] = useState('')

  const isEditeur = modeExercice === 'Éditeur'
  const showLibreTexte = claimValue === LIBRE_TEXTE_VALUE

  const [evaluationPubRef] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('evaluation') === 'publiee'
    }
    return false
  })

  useEffect(() => {
    // Pré-sélectionner le mode éditeur si ?type=editeur dans l'URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('type') === 'editeur') {
      setModeExercice('Éditeur')
    }
  }, [])

  useEffect(() => {
    if (isEditeur && claimOptions.length === 0) {
      getEditeurClaimOptions().then(setClaimOptions)
    }
  }, [isEditeur, claimOptions.length])

  useEffect(() => {
    if (!user) return

    async function loadProfile() {
      const profile = await getCurrentUserProfile()

      const hasPsc = !!(profile?.rpps || user?.user_metadata?.provider === 'psc')
      setIsFromPsc(hasPsc)

      setNom(profile?.nom || String(user?.user_metadata?.family_name || ''))
      setPrenom(profile?.prenom || String(user?.user_metadata?.given_name || ''))
      setSpecialite(profile?.specialite || String(user?.user_metadata?.specialite || ''))
      setModeExercice(prev => prev || profile?.mode_exercice || String(user?.user_metadata?.mode_exercice || ''))

      if (profile?.contact_email) {
        setContactEmail(profile.contact_email)
      } else {
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

  const claimFilled = showLibreTexte ? libreTexte.trim().length > 0 : claimValue.length > 0

  const isValid =
    nom.trim() &&
    prenom.trim() &&
    modeExercice &&
    contactEmail.trim() &&
    (isEditeur ? claimFilled : !!specialite)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await completeProfile({
        nom: nom.trim(),
        prenom: prenom.trim(),
        specialite: isEditeur ? '' : specialite,
        mode_exercice: modeExercice,
        contact_email: contactEmail.trim(),
        password: isFromPsc && password ? password : undefined,
      })

      // L'email saisi appartient déjà à un autre compte → un lien de fusion a été envoyé
      // par email à cette adresse. On affiche un écran de confirmation, sans redirection :
      // seul le propriétaire de la boîte peut poursuivre la fusion.
      if (result.status === 'FUSION_EMAIL_SENT') {
        setFusionEmailSent(result.email)
        return
      }

      if (isEditeur) {
        let editeur_id: string | undefined
        let solution_id: string | undefined

        if (claimValue.startsWith('editeur:')) {
          editeur_id = claimValue.replace('editeur:', '')
        } else if (claimValue.startsWith('solution:')) {
          solution_id = claimValue.replace('solution:', '')
        }

        const finalLibreTexte = showLibreTexte
          ? libreTexte.trim()
          : (roleMessage.trim() || undefined)
        await createEditeurClaim({
          editeur_id,
          solution_id,
          libre_texte: finalLibreTexte,
        })
      }

      // Si un mot de passe a été défini, on rafraîchit la session sous le nouvel email.
      // Sinon, la session PSC en cours reste valide (même user_id) → pas de re-signin.
      if (isFromPsc && password) {
        const supabase = createClient()
        await supabase.auth.signInWithPassword({
          email: contactEmail.trim(),
          password,
        })
      }
      window.location.href = evaluationPubRef
        ? '/mon-compte/mes-evaluations?evaluation=publiee'
        : '/mon-compte/profil'
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
        <Navbar minimal />
        <main className="pt-[72px] min-h-screen bg-surface-muted bg-dots flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </main>
      </>
    )
  }

  if (!user) {
    window.location.replace('/connexion')
    return null
  }

  if (fusionEmailSent) {
    return (
      <>
        <Navbar minimal />
        <main className="pt-[72px] min-h-screen bg-surface-muted bg-dots flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center py-16">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-accent-blue" />
            </div>
            <h1 className="text-xl font-bold text-navy mb-2">Vérifiez votre boîte mail</h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              L&apos;adresse <strong>{fusionEmailSent}</strong> est déjà associée à un compte existant.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Nous venons d&apos;y envoyer un lien pour fusionner vos deux comptes en toute sécurité.
              Cliquez sur ce lien pour finaliser — il est valable 15 minutes.
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar minimal />
      <main className="pt-[72px] min-h-screen bg-surface-muted bg-dots">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-navy mb-2">Bienvenue sur 100&nbsp;000 Médecins</h1>
            <p className="text-sm text-gray-500">
              {isFromPsc
                ? 'Vos informations professionnelles sont déjà vérifiées via Pro Santé Connect. Il ne manque que votre email pour terminer.'
                : 'Vérifiez vos informations pour terminer votre inscription.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Identité */}
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom <span className="text-red-500">*</span></label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom <span className="text-red-500">*</span></label>
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

              {/* Spécialité — masquée pour les éditeurs */}
              {!isEditeur && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Spécialité <span className="text-red-500">*</span></label>
                  {isFromPsc ? (
                    <input
                      type="text"
                      value={specialite}
                      readOnly
                      className="w-full px-3 py-2.5 border bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed rounded-xl text-sm focus:outline-none"
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
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mode d&apos;exercice <span className="text-red-500">*</span></label>
                {isFromPsc ? (
                  <input
                    type="text"
                    value={modeExercice}
                    readOnly
                    className="w-full px-3 py-2.5 border bg-surface-light border-gray-100 text-gray-500 cursor-not-allowed rounded-xl text-sm focus:outline-none"
                  />
                ) : (
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
                )}
              </div>

              {/* Dropdown revendication éditeur */}
              {isEditeur && !isFromPsc && (
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Votre solution ou éditeur <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={claimValue}
                      onChange={(e) => setClaimValue(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white"
                    >
                      <option value="">Sélectionnez votre solution ou éditeur</option>
                      <option value={LIBRE_TEXTE_VALUE}>Je ne trouve pas dans la liste</option>
                      {claimOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Votre demande sera examinée par notre équipe avant validation.
                    </p>
                  </div>
                  {showLibreTexte && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nom de votre solution ou éditeur <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={libreTexte}
                        onChange={(e) => setLibreTexte(e.target.value)}
                        placeholder="Ex : MonLogiciel, Éditeur XYZ..."
                        required
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      />
                    </div>
                  )}
                  {claimValue && !showLibreTexte && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Précisez votre rôle / fonction chez cet éditeur <span className="text-gray-400 font-normal">(facultatif)</span>
                      </label>
                      <textarea
                        value={roleMessage}
                        onChange={(e) => setRoleMessage(e.target.value)}
                        placeholder="Ex : responsable produit, CTO, support utilisateur, etc."
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y overflow-y-auto min-h-[72px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {isFromPsc && (
                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={openErrModal}
                    className="text-xs text-gray-400 hover:text-accent-blue underline"
                  >
                    Une erreur ?
                  </button>
                </div>
              )}
            </div>

            {/* Coordonnées */}
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
                    ? 'Pour vous prévenir si un éditeur répond à votre avis ou si une solution que vous avez notée évolue — et pour récupérer votre compte. Jamais de spam, jamais transmis à un éditeur.'
                    : 'Adresse confirmée — utilisée pour les notifications et la récupération de compte.'}
                </p>
              </div>

              {isFromPsc && (
                <div>
                  {!showPassword ? (
                    <button
                      type="button"
                      onClick={() => setShowPassword(true)}
                      className="text-sm text-accent-blue hover:underline"
                    >
                      + Définir un mot de passe (optionnel)
                    </button>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Mot de passe <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        placeholder="6 caractères minimum"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Optionnel : vous pourrez aussi vous reconnecter par email. Sinon, reconnectez-vous d&apos;un clic via Pro Santé Connect (vous pourrez le définir plus tard depuis votre profil).
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            <p className="text-xs text-gray-400 text-center">
              Pseudo et avatar sont facultatifs et se règlent à tout moment depuis votre profil.
            </p>

            <div className="flex justify-end">
              <Button
                variant="primary"
                className={!isValid || submitting ? 'opacity-50 pointer-events-none' : ''}
              >
                {submitting ? 'Enregistrement...' : 'Terminer mon inscription'}
              </Button>
            </div>
          </form>
        </div>

        {/* Modale : signaler une erreur sur l'identité PSC */}
        <Modal open={showErrModal} onClose={() => setShowErrModal(false)} size="md">
          <Modal.Header icon={<AlertCircle className="w-4 h-4" />} onClose={() => setShowErrModal(false)}>
            Signaler une erreur
          </Modal.Header>
          {errSent ? (
            <Modal.Body>
              <p className="text-sm text-gray-700">
                Merci, votre signalement a bien été transmis à notre équipe. Nous vous répondrons à l&apos;adresse indiquée.
              </p>
            </Modal.Body>
          ) : (
            <Modal.Body>
              <p className="text-xs text-gray-500 mb-4">
                Vos informations professionnelles proviennent de Pro Santé Connect (annuaire RPPS) et ne sont pas
                modifiables ici. Indiquez l&apos;erreur ci-dessous : notre équipe vérifiera et reviendra vers vous.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Information concernée</label>
                  <select
                    value={errChamp}
                    onChange={(e) => setErrChamp(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white"
                  >
                    <option>Spécialité</option>
                    <option>Mode d&apos;exercice</option>
                    <option>Nom / Prénom</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Qu&apos;est-ce qui est incorrect ? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={errMessage}
                    onChange={(e) => setErrMessage(e.target.value)}
                    rows={3}
                    placeholder="Décrivez l'erreur (ex. ma spécialité réelle est…)"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Votre email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={errEmail}
                    onChange={(e) => setErrEmail(e.target.value)}
                    placeholder="votre@email.fr"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  />
                  <p className="text-xs text-gray-400 mt-1">Pour que l&apos;on puisse vous répondre.</p>
                </div>
                {errError && <p className="text-sm text-red-600">{errError}</p>}
              </div>
            </Modal.Body>
          )}
          <Modal.Footer>
            {errSent ? (
              <Button variant="primary" onClick={() => setShowErrModal(false)}>Fermer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setShowErrModal(false)}>Annuler</Button>
                <Button
                  variant="primary"
                  loading={errSubmitting}
                  disabled={!errMessage.trim() || !errEmail.includes('@')}
                  onClick={submitErrSignalement}
                >
                  Envoyer
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>
      </main>
    </>
  )
}
