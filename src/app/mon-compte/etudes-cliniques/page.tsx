'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Suspense, lazy } from 'react'

// Chargement différé des deux vues selon le rôle
const EtudesCliniquesPublic = lazy(() => import('./_public'))
const EtudesCliniquesAdmin = lazy(() => import('./_admin'))

export default function EtudesCliniquesPage() {
  const { userRole, loading } = useAuth()

  if (loading) {
    return <div className="animate-pulse text-gray-400 text-sm">Chargement…</div>
  }

  return (
    <Suspense fallback={<div className="animate-pulse text-gray-400 text-sm">Chargement…</div>}>
      {userRole === 'digital_medical_hub'
        ? <EtudesCliniquesAdmin />
        : <EtudesCliniquesPublic />
      }
    </Suspense>
  )
}
