'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { completeProfile } from '@/lib/actions/user'
import { SPECIALITES, MODES_EXERCICE, AVATARS } from '@/lib/constants/profil'
import Button from '@/components/ui/Button'
import { Check } from 'lucide-react'

export default function ProfilPage() {
  const { user } = useAuth()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [modeExercice, setModeExercice] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Charger le profil existant
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('users')
      .select('nom, prenom, specialite, mode_exercice, portrait')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNom(data.nom || '')
          setPrenom(data.prenom || '')
          setSpecialite(data.specialite || '')
          setModeExercice(data.mode_exercice || '')
          setSelectedAvatar(data.portrait || null)
        }
        setLoading(false)
      })
  }, [user])

  const isValid = nom.trim() && prenom.trim() && specialite && modeExercice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await completeProfile({
        nom: nom.trim(),
        prenom: prenom.trim(),
        specialite,
        mode_exercice: modeExercice,
        portrait: selectedAvatar || undefined,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erreur mise à jour profil:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement du profil...</div>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-6">Mon compte</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
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

        {/* Exercice professionnel */}
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

        {/* Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl">
            Profil mis à jour avec succès.
          </div>
        )}

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
    </div>
  )
}
