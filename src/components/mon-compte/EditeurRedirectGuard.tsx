'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

/**
 * Garde-fou client : redirige un compte éditeur vers `to`. Utilisé sur les pages
 * réservées aux médecins accessibles par URL directe (ex. proposer un questionnaire de
 * thèse, masqué de l'UI éditeur mais l'URL reste atteignable).
 */
export default function EditeurRedirectGuard({ to }: { to: string }) {
  const { isEditeur, loading } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!loading && isEditeur) router.replace(to)
  }, [isEditeur, loading, router, to])
  return null
}
