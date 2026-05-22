'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/** API globale injectée par le script Turnstile de Cloudflare. */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Chargement unique du script (mémoïsé si plusieurs widgets sur la page).
let scriptPromise: Promise<void> | null = null
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile : échec du chargement du script'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export type TurnstileHandle = { reset: () => void }

/**
 * Widget Cloudflare Turnstile (anti-bot).
 * Appelle `onVerify(token)` quand le défi est résolu, `onVerify('')` quand le token
 * expire ou en cas d'erreur. Le parent peut appeler `reset()` via la ref pour
 * réarmer le widget (le token Turnstile est à usage unique).
 *
 * Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` n'est pas configurée : ne rend rien — la
 * vérification serveur (`verifyTurnstileToken`) est elle aussi neutralisée.
 */
const TurnstileWidget = forwardRef<TurnstileHandle, { onVerify: (token: string) => void }>(
  function TurnstileWidget({ onVerify }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    // onVerify gardé dans une ref → l'effet de montage ne dépend pas de son identité.
    const onVerifyRef = useRef(onVerify)
    onVerifyRef.current = onVerify

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    useImperativeHandle(ref, () => ({
      reset() {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current)
          onVerifyRef.current('')
        }
      },
    }))

    useEffect(() => {
      if (!siteKey) return
      let cancelled = false
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerifyRef.current(token),
            'expired-callback': () => onVerifyRef.current(''),
            'error-callback': () => onVerifyRef.current(''),
          })
        })
        .catch(() => {
          // Script bloqué / indisponible : pas de token → le serveur rejettera la soumission.
        })
      return () => {
        cancelled = true
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
      }
    }, [siteKey])

    if (!siteKey) return null
    return <div ref={containerRef} className="flex justify-center" />
  }
)

export default TurnstileWidget
