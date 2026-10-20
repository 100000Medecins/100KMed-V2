export const dynamic = 'force-dynamic'

import type { ComponentProps } from 'react'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BlogForm from '@/components/admin/BlogForm'
import TooltipNoteGlobaleForm from '@/components/admin/TooltipNoteGlobaleForm'
import PageHistoryButton from '@/components/admin/PageHistoryButton'
import PortabiliteTextesForm from '@/components/admin/PortabiliteTextesForm'
import { updatePageStatique, updateNoteGlobaleTooltip, updatePortabiliteTextes } from '@/lib/actions/admin'
import { getPageStatiqueHistory } from '@/lib/db/pages'
import { lireTextesPortabilite, SLUG_PAGE_PORTABILITE } from '@/lib/data/portabilite'

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

  // Historique des versions (table d'audit, peuplée par trigger SQL).
  // Best-effort : si la table n'existe pas (migration pas encore lancée), on continue avec [].
  let history: Awaited<ReturnType<typeof getPageStatiqueHistory>> = []
  try {
    history = await getPageStatiqueHistory(id, 50)
  } catch {
    history = []
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

  const historique = history.map((h) => ({
    id: h.id,
    saved_at: h.saved_at,
    titre: h.titre,
    contenu: h.contenu,
    meta_description: h.meta_description,
  }))

  // Page /portabilite : formulaire dédié, textes rangés en JSON dans `contenu`.
  if (page.slug === SLUG_PAGE_PORTABILITE) {
    return (
      <div>
        <div className="flex items-start justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-navy">Modifier : Portabilité des données</h1>
          <PageHistoryButton pageId={id} history={historique} />
        </div>
        <div className="bg-white rounded-card shadow-card p-6 md:p-8">
          <PortabiliteTextesForm textes={lireTextesPortabilite(page)} action={updatePortabiliteTextes.bind(null, id)} />
        </div>
      </div>
    )
  }

  const boundAction = updatePageStatique.bind(null, id)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-navy">
          Modifier : {page.titre}
        </h1>
        <PageHistoryButton pageId={id} history={historique} />
      </div>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        {/* metadata est un Json en base, typé en liste de syndicats dans BlogForm (qui-sommes-nous) */}
        <BlogForm page={page as unknown as ComponentProps<typeof BlogForm>['page']} action={boundAction} />
      </div>
    </div>
  )
}
