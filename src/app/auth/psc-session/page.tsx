'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function PscSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const tokenHash = searchParams.get('token')
    const next = searchParams.get('next') || '/mon-compte/profil'

    if (!tokenHash) {
      router.replace('/connexion?error=psc_session_error')
      return
    }

    const supabase = createClient()
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      .then(({ error }) => {
        if (error) {
          console.error('[PSC] client verifyOtp error:', error)
          router.replace('/connexion?error=psc_session_error')
        } else {
          router.replace(next)
        }
      })
  }, [router, searchParams])

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
