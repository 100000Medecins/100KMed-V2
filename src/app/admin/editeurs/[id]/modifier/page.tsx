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

// Options de maison-mère : tous les autres éditeurs (l'éditeur courant ne peut pas être son propre parent).
async function getParentOptions(currentId: string): Promise<{ id: string; nom: string }[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('editeurs')
    .select('id, nom, nom_commercial')
    .neq('id', currentId)
    .order('nom', { ascending: true })
  return (data ?? []).map((e) => ({ id: e.id, nom: e.nom_commercial || e.nom || e.id }))
}

export default async function AdminModifierEditeurPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const { data: editeur } = await supabase.from('editeurs').select('*').eq('id', id).single()
  if (!editeur) notFound()

  const [solutions, solutionsSansEditeur, parentOptions] = await Promise.all([
    getEditeurSolutions(id),
    getSolutionsSansEditeur(),
    getParentOptions(id),
  ])
  const boundAction = updateEditeur.bind(null, id)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy">
          Modifier : {(editeur as Editeur).nom_commercial || (editeur as Editeur).nom}
        </h1>
        <a
          href={`/editeur/${(editeur as Editeur).slug}`}
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
            <EditeurWithSearch editeur={editeur as Editeur} parentOptions={parentOptions} action={boundAction} />
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
