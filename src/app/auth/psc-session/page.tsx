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
    const cid = searchParams.get('cid')

    // Mesure (additive, jamais bloquante) : remonter l'issue du verifyOtp,
    // corrélée au handoff_start posé côté serveur (même correlation_id).
    const logEvent = (step: string, detail?: string) => {
      if (!cid) return
      try {
        const payload = JSON.stringify({ correlation_id: cid, step, detail })
        const blob = new Blob([payload], { type: 'application/json' })
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/psc-session-event', blob)
        } else {
          fetch('/api/psc-session-event', {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          })
        }
      } catch { /* jamais bloquant */ }
    }

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
      logEvent('verify_timeout')
      redirectTo('/connexion?error=psc_session_error')
    }, 10000)

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      .then(({ data, error }) => {
        clearTimeout(timeout)
        if (error) {
          console.error('[PSC session] verifyOtp error:', error.message)
          logEvent('verify_error', error.message)
          redirectTo('/connexion?error=psc_session_error')
        } else {
          console.log('[PSC session] OK, user:', data?.user?.id, '— redirect vers:', next)
          logEvent('verify_success')
          redirectTo(next)
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('[PSC session] verifyOtp exception:', err)
        logEvent('verify_error', String(err?.message || err))
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
