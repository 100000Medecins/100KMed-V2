'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { setPreference, removePreference } from '@/lib/actions/user'

export default function MesPreferencesPage() {
  const { user } = useAuth()
  const [allPreferences, setAllPreferences] = useState<any[]>([])
  const [userPreferenceIds, setUserPreferenceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    Promise.all([
      s.from('preferences').select('*').eq('is_actif', true).order('ordre'),
      s.from('users_preferences').select('preference_id').eq('user_id', user.id),
    ]).then(([prefsResult, userPrefsResult]) => {
      setAllPreferences(prefsResult.data || [])
      setUserPreferenceIds((userPrefsResult.data || []).map((p: any) => p.preference_id))
      setLoading(false)
    })
  }, [user])

  const handleToggle = async (preferenceId: string) => {
    if (userPreferenceIds.includes(preferenceId)) {
      await removePreference(preferenceId)
      setUserPreferenceIds((prev) => prev.filter((id) => id !== preferenceId))
    } else {
      await setPreference(preferenceId)
      setUserPreferenceIds((prev) => [...prev, preferenceId])
    }
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement...</div>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-2">Mes préférences</h1>
      <p className="text-gray-500 text-sm mb-6">
        Sélectionnez les thématiques qui vous intéressent.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allPreferences.map((pref) => {
          const isSelected = userPreferenceIds.includes(pref.id)
          return (
            <button
              key={pref.id}
              onClick={() => handleToggle(pref.id)}
              className={`p-4 rounded-card border-2 text-left transition-all ${
                isSelected
                  ? 'border-accent-blue bg-accent-blue/5 shadow-soft'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <span className={`text-sm font-medium ${isSelected ? 'text-accent-blue' : 'text-gray-700'}`}>
                {pref.libelle}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
