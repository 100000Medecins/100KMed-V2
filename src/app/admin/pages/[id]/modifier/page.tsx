export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BlogForm from '@/components/admin/BlogForm'
import TooltipNoteGlobaleForm from '@/components/admin/TooltipNoteGlobaleForm'
import { updatePageStatique, updateNoteGlobaleTooltip } from '@/lib/actions/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPageStatiqueByIdAdmin(id: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export default async function AdminEditPagePage({ params }: PageProps) {
  const { id } = await params

  let page
  try {
    page = await getPageStatiqueByIdAdmin(id)
  } catch {
    notFound()
  }

  // Routage conditionnel : pages "tooltip" → formulaire dédié structuré JSON ;
  // toutes les autres pages éditoriales (cgu, rgpd, transparence…) → formulaire générique BlogForm.
  if ((page as { slug?: string }).slug === 'tooltip-note-globale') {
    const boundAction = updateNoteGlobaleTooltip.bind(null, id)
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-2">{(page as { titre: string }).titre}</h1>
        <p className="text-sm text-gray-500 mb-8">Contenu structuré (JSON) — utilisé sur les fiches solutions.</p>
        <div className="bg-white rounded-card shadow-card p-6 md:p-8">
          <TooltipNoteGlobaleForm
            initialContenu={(page as { contenu: string | null }).contenu}
            action={boundAction}
          />
        </div>
      </div>
    )
  }

  const boundAction = updatePageStatique.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">
        Modifier : {page.titre}
      </h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <BlogForm page={page as any} action={boundAction} />
      </div>
    </div>
  )
}
