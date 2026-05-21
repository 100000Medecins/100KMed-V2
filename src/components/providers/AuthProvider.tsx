'use client'

import { createContext, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerWithEmail, sendPasswordReset } from '@/lib/actions/user'
import { connectWithPsc } from '@/lib/auth/psc'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userRole: string | null
  isEtudiant: boolean
  isEditeur: boolean
  loading: boolean
  signInWithPSC: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, elapsedMs?: number, signupType?: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  isEtudiant: false,
  isEditeur: false,
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
  const [isEditeur, setIsEditeur] = useState(false)
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any).from('users').select('role, mode_exercice').eq('id', userId).single()
        const role = (data as any)?.role ?? null
        const modeExercice = (data as any)?.mode_exercice
        setUserRole(role)
        setIsEtudiant(modeExercice === 'Étudiant')
        // isEditeur dès l'inscription (mode_exercice) — sans attendre la validation admin (role)
        setIsEditeur(modeExercice === 'Éditeur' || role === 'editeur')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setUserRole(null)
        setIsEtudiant(false)
        setIsEditeur(false)
      }
    }

    // onAuthStateChange émet INITIAL_SESSION dès l'abonnement — pas besoin de getSession() séparé
    // (les deux simultanés causaient une collision sur le lock navigator.locks de Supabase)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null

      // TOKEN_REFRESHED avec le même utilisateur : évite les re-renders inutiles
      // qui déclencheraient les useEffect([user]) dans les pages enfants
      if (event === 'TOKEN_REFRESHED' && newUser?.id === userIdRef.current) {
        return
      }

      userIdRef.current = newUser?.id ?? null
      setUser(newUser)
      setLoading(false)
      // fetchRole en fire-and-forget : ne doit jamais bloquer setLoading
      if (newUser) fetchRole(newUser.id)
      else { setUserRole(null); setIsEtudiant(false); setIsEditeur(false) }
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
      if (error.message === 'Email not confirmed')
        return { error: 'Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail (et vos spams).' }
      return { error: error.message }
    }
    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string, elapsedMs?: number, signupType?: string) => {
    // Inscription via server action : création admin (email_confirm: false) + envoi
    // d'un email de confirmation à lien HMAC idempotent (résistant au pré-scan des
    // clients mail). Plus de session immédiate — l'utilisateur confirme puis se connecte.
    const res = await registerWithEmail({ email, password, elapsedMs, signupType })
    if (res.status === 'EMAIL_EXISTS') {
      return { error: 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.' }
    }
    if (res.status === 'ERROR') {
      return { error: res.message }
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
    setIsEditeur(false)
    // Déléguer la déconnexion à la route serveur qui nettoie les cookies SSR
    window.location.href = '/api/auth/signout'
  }

  return (
    <AuthContext.Provider value={{ user, userRole, isEtudiant, isEditeur, loading, signInWithPSC, signInWithEmail, signUpWithEmail, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
