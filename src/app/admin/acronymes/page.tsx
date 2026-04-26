export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import AcronymesAdminClient from '@/components/admin/AcronymesAdminClient'

type Acronyme = {
  id: string
  sigle: string
  definition: string
  description: string | null
  lien: string | null
  categorie: string | null
  created_at: string
}

type Suggestion = {
  id: string
  sigle: string
  definition: string
  description: string | null
  email: string | null
  created_at: string
}

async function getData() {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const [{ data: acronymes }, { data: suggestions }] = await Promise.all([
    s.from('acronymes').select('*').order('sigle', { ascending: true }),
    s.from('suggestions_acronymes').select('*').order('created_at', { ascending: false }),
  ])
  return {
    acronymes: (acronymes ?? []) as Acronyme[],
    suggestions: (suggestions ?? []) as Suggestion[],
  }
}

export default async function AdminAcronymesPage() {
  const { acronymes, suggestions } = await getData()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Glossaire — Acronymes</h1>
          <p className="text-sm text-gray-500 mt-1">{acronymes.length} acronyme{acronymes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <AcronymesAdminClient initialAcronymes={acronymes} initialSuggestions={suggestions} />
    </div>
  )
}
