export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { updatePartenaire } from '@/lib/actions/admin'
import PartenaireForm from '@/components/admin/PartenaireForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditPartenairePage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const { data: partenaire } = await supabase.from('partenaires').select('*').eq('id', id).single()
  if (!partenaire) notFound()

  const boundAction = updatePartenaire.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Modifier : {partenaire.nom}</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <PartenaireForm partenaire={partenaire} action={boundAction} />
      </div>
    </div>
  )
}
