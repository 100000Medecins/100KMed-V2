'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from '@/lib/actions/account'
import { useAuth } from '@/components/providers/AuthProvider'
import { AlertTriangle, Trash2, Archive } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface Props {
  onClose: () => void
}

export default function DeleteAccountModal({ onClose }: Props) {
  const { signOut } = useAuth()
  const [supprimerAvis, setSupprimerAvis] = useState(false)
  const [raison, setRaison] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [, startTransition] = useTransition()

  function handleConfirm() {
    setIsDeleting(true)
    setError(null)
    startTransition(async () => {
      try {
        await deleteAccount({ supprimerAvis, raison })
        await signOut()
      } catch (e) {
        setIsDeleting(false)
        setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
        setStep('form')
      }
    })
  }

  return (
    <Modal open onClose={isDeleting ? () => {} : onClose} size="md" closeOnBackdropClick={!isDeleting}>
      <Modal.Header
        variant="danger"
        icon={<Trash2 className="w-4 h-4" />}
        onClose={isDeleting ? undefined : onClose}
      >
        Supprimer mon compte
      </Modal.Header>

      {step === 'form' ? (
        <>
          <Modal.Body className="space-y-5">
            {/* Avertissement */}
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-relaxed">
                Cette action est <strong>irréversible</strong>. Votre compte et toutes vos données personnelles seront définitivement supprimés.
              </p>
            </div>

            {/* Choix pour les avis */}
            <div>
              <p className="text-sm font-semibold text-navy mb-3">Que souhaitez-vous faire de vos avis publiés ?</p>
              <div className="space-y-2.5">
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${!supprimerAvis ? 'border-accent-blue bg-accent-blue/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="avis"
                    checked={!supprimerAvis}
                    onChange={() => setSupprimerAvis(false)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-accent-blue" />
                      <span className="text-sm font-medium text-navy">Conserver mes avis (anonymisés)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vos notes restent visibles sur le site mais ne sont plus associées à votre nom. Elles continuent d&apos;aider vos confrères.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${supprimerAvis ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="avis"
                    checked={supprimerAvis}
                    onChange={() => setSupprimerAvis(true)}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-sm font-medium text-navy">Supprimer tous mes avis</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Toutes vos évaluations seront définitivement supprimées de la plateforme.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Raison optionnelle */}
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">
                Raison de votre départ <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Votre retour nous aide à améliorer la plateforme..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-300"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{raison.length}/500</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="ghost" size="md" onClick={onClose}>Annuler</Button>
            <Button variant="danger" size="md" onClick={() => setStep('confirm')}>Continuer</Button>
          </Modal.Footer>
        </>
      ) : (
        <>
          <Modal.Body className="space-y-5">
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-bold text-navy text-base mb-2">Êtes-vous absolument sûr ?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Votre compte sera <strong>définitivement supprimé</strong>.
                {supprimerAvis
                  ? ' Tous vos avis seront également effacés.'
                  : ' Vos avis resteront publiés de façon anonyme.'}
              </p>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="ghost" size="md" onClick={() => setStep('form')} disabled={isDeleting}>
              Retour
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirm} loading={isDeleting}>
              {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}
