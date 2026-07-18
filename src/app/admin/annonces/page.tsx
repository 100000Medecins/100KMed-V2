export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import AnnoncesList from '@/components/admin/AnnoncesList'
import type { Annonce } from '@/lib/db/annonces'

async function getAnnoncesAdmin(): Promise<Annonce[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('annonces')
    .select('*')
    .order('ordre', { ascending: true })
    .order('date_debut', { ascending: false })
  return data ?? []
}

export default async function AdminAnnoncesPage() {
  const annonces = await getAnnoncesAdmin()
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Annonces</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bandeaux affichés en haut de la page d'accueil, pendant leur fenêtre de dates.
          </p>
        </div>
        <Link
          href="/admin/annonces/nouveau"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-button hover:bg-navy-dark transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Nouvelle annonce
        </Link>
      </div>
      <AnnoncesList initialAnnonces={annonces} />
    </div>
  )
}
