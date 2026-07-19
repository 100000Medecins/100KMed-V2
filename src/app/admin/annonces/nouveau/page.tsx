export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import AnnonceForm from '@/components/admin/AnnonceForm'
import { createAnnonce } from '@/lib/actions/admin'

export default function NouvelleAnnoncePage() {
  return (
    <div>
      <Link href="/admin/annonces" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux annonces
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvelle annonce</h1>
      <AnnonceForm action={createAnnonce} />
    </div>
  )
}
