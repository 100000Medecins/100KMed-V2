'use client'

/**
 * Studio Instagram hors article (Admin → Blog → Studio Instagram) : le gabarit de la charte sur
 * une photo importée, avec un texte libre ; rien n'est enregistré, on télécharge les JPEG.
 * Chargé seulement dans le navigateur (canvas, police).
 */

import dynamic from 'next/dynamic'
import Card from '@/components/ui/Card'

const StudioVisuel = dynamic(() => import('@/components/admin/StudioVisuel'), {
  ssr: false,
  loading: () => (
    <Card padding="lg" className="text-center text-sm text-gray-500">
      Chargement du studio…
    </Card>
  ),
})

export default function StudioLibre() {
  return <StudioVisuel presentation="page" nomFichier="visuel" />
}
