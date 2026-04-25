'use client'

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createUserProfile, sendPasswordReset } from '@/lib/actions/user'
import { connectWithPsc } from '@/lib/auth/psc'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userRole: string | null
  isEtudiant: boolean
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
  userRole: null,
  isEtudiant: false,
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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isEtudiant, setIsEtudiant] = useState(false)
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

    const fetchRole = async (userId: string) => {
      try {
        const { data } = await supabase.from('users').select('role, mode_exercice').eq('id', userId).single()
        setUserRole(data?.role ?? null)
        setIsEtudiant((data as { mode_exercice?: string | null } | null)?.mode_exercice === 'Étudiant')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setUserRole(null)
        setIsEtudiant(false)
      }
    }

    // onAuthStateChange émet INITIAL_SESSION dès l'abonnement — pas besoin de getSession() séparé
    // (les deux simultanés causaient une collision sur le lock navigator.locks de Supabase)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchRole(session.user.id)
      else { setUserRole(null); setIsEtudiant(false) }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  /**
   * Connexion via Pro Santé Connect (PSC) — flux direct BAS.
   * Redirige vers wallet.bas.psc.esante.gouv.fr/auth.
   * Le retour est géré par /onboarding/signincallback.
   */
  const signInWithPSC = async () => {
    connectWithPsc()
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message === 'Invalid login credentials')
        return { error: 'Email ou mot de passe incorrect.' }
      return { error: error.message }
    }
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

    // Supabase ne retourne pas d'erreur si l'email existe déjà (il envoie juste un mail silencieux)
    // mais l'utilisateur retourné a un tableau identities vide dans ce cas
    if (data.user?.identities?.length === 0) {
      return { error: 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.' }
    }

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
    return await sendPasswordReset(email)
  }

  const updatePassword = async (password: string) => {
    if (!supabase) return { error: 'Supabase non configuré' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    // Nettoyage local immédiat (localStorage) pour les tokens éventuellement mis en cache
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
    } catch {
      // ignore
    }
    setUser(null)
    setUserRole(null)
    setIsEtudiant(false)
    // Déléguer la déconnexion à la route serveur qui nettoie les cookies SSR
    window.location.href = '/api/auth/signout'
  }

  return (
    <AuthContext.Provider value={{ user, userRole, isEtudiant, loading, signInWithPSC, signInWithEmail, signUpWithEmail, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
