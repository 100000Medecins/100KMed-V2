'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function PscSessionContent() {
  const searchParams = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const tokenHash = searchParams.get('token')
    const next = searchParams.get('next') || '/mon-compte/profil'

    const redirectTo = (path: string) => {
      window.location.replace(path)
    }

    if (!tokenHash) {
      redirectTo('/connexion?error=psc_session_error')
      return
    }

    console.log('[PSC session] token reçu, appel verifyOtp…')

    const supabase = createClient()

    const timeout = setTimeout(() => {
      console.warn('[PSC session] timeout 10s — redirection forcée')
      redirectTo('/connexion?error=psc_session_error')
    }, 10000)

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      .then(({ data, error }) => {
        clearTimeout(timeout)
        if (error) {
          console.error('[PSC session] verifyOtp error:', error.message)
          redirectTo('/connexion?error=psc_session_error')
        } else {
          console.log('[PSC session] OK, user:', data?.user?.id, '— redirect vers:', next)
          redirectTo(next)
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('[PSC session] verifyOtp exception:', err)
        redirectTo('/connexion?error=psc_session_error')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light">
      <p className="text-gray-400 text-sm">Connexion en cours…</p>
    </div>
  )
}

export default function PscSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <p className="text-gray-400 text-sm">Connexion en cours…</p>
      </div>
    }>
      <PscSessionContent />
    </Suspense>
  )
}
