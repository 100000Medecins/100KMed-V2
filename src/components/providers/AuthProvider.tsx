'use client'

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createUserProfile } from '@/lib/actions/user'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithPSC: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signInWithPSC: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

/**
 * Vérifie si Supabase est réellement configuré (pas de placeholder).
 * Côté client, les NEXT_PUBLIC_* sont inlinés au build time.
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  )
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Ne créer le client Supabase que s'il est configuré
  const supabase = useMemo(
    () => (isSupabaseConfigured() ? createClient() : null),
    []
  )

  useEffect(() => {
    // Si Supabase n'est pas configuré, on skip l'auth
    if (!supabase) {
      setLoading(false)
      return
    }

    // Récupérer la session initiale
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch {
        // Supabase inaccessible
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Écouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  /**
   * Connexion via Pro Santé Connect (PSC).
   * Utilise le provider OIDC custom configuré dans Supabase.
   */
  const signInWithPSC = async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'keycloak' as any, // PSC utilise Keycloak sous le capot
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes: 'openid scope_all',
      },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) return { error: error.message }

    // Créer le profil public.users immédiatement après l'inscription
    if (data.user) {
      try {
        await createUserProfile(data.user.id, email)
      } catch (e) {
        console.error('Erreur création profil:', e)
      }
    }

    return { error: null }
  }

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  const updatePassword = async (password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithPSC, signInWithEmail, signUpWithEmail, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
