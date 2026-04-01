export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PartenairesList from '@/components/admin/PartenairesList'

async function getAllPartenaires() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('partenaires')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export default async function AdminPartenairesPage() {
  const partenaires = await getAllPartenaires()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Partenaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            {partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''} — glissez pour réordonner
          </p>
        </div>
        <Link href="/admin/partenaires/nouveau"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card transition-all duration-300">
          <Plus className="w-4 h-4" />
          Ajouter un partenaire
        </Link>
      </div>
      <PartenairesList initialPartenaires={partenaires} />
    </div>
  )
}
