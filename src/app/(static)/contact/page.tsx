'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { sendContactMessage } from '@/lib/actions/contact'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')

    try {
      await sendContactMessage({
        ...formData,
        recaptchaToken: '', // TODO: intégrer reCAPTCHA
      })
      setStatus('success')
      setFormData({ nom: '', prenom: '', email: '', telephone: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-lg mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-2">Contactez-nous</h1>
          <p className="text-gray-500 text-sm mb-8">
            Une question ? N&apos;hésitez pas à nous écrire.
          </p>

          {status === 'success' ? (
            <div className="bg-rating-green/10 text-rating-green p-4 rounded-card text-center">
              Votre message a bien été envoyé. Nous vous répondrons rapidement.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nom</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Prénom</label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-500">Une erreur est survenue. Veuillez réessayer.</p>
              )}

              <Button
                variant="primary"
                className={`w-full justify-center ${status === 'sending' ? 'opacity-50' : ''}`}
              >
                {status === 'sending' ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
