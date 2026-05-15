export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { updateEditeur } from '@/lib/actions/admin'
import EditeurWithSearch from '@/components/admin/EditeurWithSearch'
import EditeurSolutionsManager from '@/components/admin/EditeurSolutionsManager'
import type { SolutionLite } from '@/components/admin/EditeurSolutionsManager'
import type { Editeur } from '@/types/models'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getEditeurSolutions(id: string): Promise<SolutionLite[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('solutions')
    .select('id, nom, actif')
    .eq('id_editeur', id)
    .order('nom', { ascending: true })
  return (data ?? []) as SolutionLite[]
}

async function getSolutionsSansEditeur(): Promise<SolutionLite[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('solutions')
    .select('id, nom, actif')
    .is('id_editeur', null)
    .order('nom', { ascending: true })
  return (data ?? []) as SolutionLite[]
}

export default async function AdminModifierEditeurPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const { data: editeur } = await supabase.from('editeurs').select('*').eq('id', id).single()
  if (!editeur) notFound()

  const [solutions, solutionsSansEditeur] = await Promise.all([
    getEditeurSolutions(id),
    getSolutionsSansEditeur(),
  ])
  const boundAction = updateEditeur.bind(null, id)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy">
          Modifier : {(editeur as Editeur).nom_commercial || (editeur as Editeur).nom}
        </h1>
        <a
          href={`/editeur/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent-blue hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Voir la page publique
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-card shadow-card p-6 md:p-8">
            <EditeurWithSearch editeur={editeur as Editeur} action={boundAction} />
          </div>
        </div>

        <div>
          <EditeurSolutionsManager
            editeurId={id}
            solutionsLiees={solutions}
            solutionsSansEditeur={solutionsSansEditeur}
          />
        </div>
      </div>
    </div>
  )
}
