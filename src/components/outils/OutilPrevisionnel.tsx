'use client'

import { useEffect } from 'react'

// Charge le script de l'outil Prévisionnel (public/outils/previsionnel-msp/outil.js, JavaScript
// sans dépendance, mis en cache par le navigateur) et le monte sur le balisage #msp rendu par la
// page ; le démonte quand on quitte la page sans rechargement.

const SCRIPT = '/outils/previsionnel-msp/outil.js'

declare global {
  interface Window {
    MSPOutil?: { monter: () => () => void }
  }
}

export default function OutilPrevisionnel() {
  useEffect(() => {
    let demonter: (() => void) | undefined
    let actif = true
    const lancer = () => {
      if (actif && window.MSPOutil) demonter = window.MSPOutil.monter()
    }
    if (window.MSPOutil) {
      lancer()
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = SCRIPT
        document.body.appendChild(script)
      }
      script.addEventListener('load', lancer, { once: true })
    }
    return () => {
      actif = false
      demonter?.()
    }
  }, [])

  return null
}
