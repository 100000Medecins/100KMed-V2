export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import AnnonceForm from '@/components/admin/AnnonceForm'
import { updateAnnonce } from '@/lib/actions/admin'
import type { Annonce } from '@/lib/db/annonces'

async function getAnnonceById(id: string): Promise<Annonce | null> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('annonces').select('*').eq('id', id).single()
  return data ?? null
}

export default async function ModifierAnnoncePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const annonce = await getAnnonceById(params.id)
  if (!annonce) notFound()

  const action = updateAnnonce.bind(null, annonce.id)

  return (
    <div>
      <Link href="/admin/annonces" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-6">
        <ChevronLeft className="w-4 h-4" /> Retour aux annonces
      </Link>
      <h1 className="text-2xl font-bold text-navy mb-8">{annonce.titre ?? "Modifier l'annonce"}</h1>
      <AnnonceForm annonce={annonce} action={action} />
    </div>
  )
}
