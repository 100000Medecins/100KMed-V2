export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BlogForm from '@/components/admin/BlogForm'
import { updatePageStatique } from '@/lib/actions/admin'

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

export default async function AdminEditBlogPage({ params }: PageProps) {
  const { id } = await params

  let page
  try {
    page = await getPageStatiqueByIdAdmin(id)
  } catch {
    notFound()
  }

  const boundAction = updatePageStatique.bind(null, id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">
        Modifier : {page.titre}
      </h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <BlogForm page={page} action={boundAction} />
      </div>
    </div>
  )
}
